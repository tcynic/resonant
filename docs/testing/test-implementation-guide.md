# Test Implementation Guide

## Overview

This guide provides practical implementation details for testing the Resonant application, including mock strategies, test data management, tool configurations, and testing patterns specific to the technology stack.

## Table of Contents

1. [Mock Strategies for External Services](#mock-strategies-for-external-services)
2. [Convex Real-time Testing](#convex-real-time-testing)
3. [AI Processing Pipeline Testing](#ai-processing-pipeline-testing)
4. [Authentication Flow Testing](#authentication-flow-testing)
5. [Test Data Management](#test-data-management)
6. [Testing Tools & Frameworks](#testing-tools--frameworks)
7. [CI/CD Integration](#cicd-integration)
8. [Performance Testing Tools](#performance-testing-tools)

---

## Mock Strategies for External Services

### Convex Backend Mocking

#### Jest Mock Setup for Convex Hooks

```typescript
// test-utils/convex-mocks.ts

import { jest } from '@jest/globals'

// Mock Convex React hooks
export const mockConvexHooks = () => {
  const mockUseQuery = jest.fn()
  const mockUseMutation = jest.fn()
  const mockUseAction = jest.fn()

  jest.mock('convex/react', () => ({
    useQuery: mockUseQuery,
    useMutation: mockUseMutation,
    useAction: mockUseAction,
    ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
    ConvexReactClient: jest.fn().mockImplementation(() => ({
      setAuth: jest.fn(),
      clearAuth: jest.fn(),
    })),
  }))

  return {
    mockUseQuery,
    mockUseMutation,
    mockUseAction,
  }
}

// Convex query response builders
export const createMockQueryResponse = <T>(data: T, isLoading = false) => {
  if (isLoading) return undefined
  return data
}

export const createMockMutation = <T>(
  mockImplementation?: (args: any) => Promise<T>
) => {
  return jest.fn(mockImplementation || (() => Promise.resolve({} as T)))
}

// Example usage in tests
export const setupJournalEntryMocks = (
  mockUseQuery: jest.Mock,
  mockUseMutation: jest.Mock
) => {
  const mockEntries = [
    {
      _id: 'entry_1',
      content: 'Test journal entry',
      mood: 'happy',
      relationshipId: 'rel_1',
      createdAt: Date.now(),
    },
  ]

  // Mock query responses
  mockUseQuery.mockImplementation((api: any, args?: any) => {
    if (api.toString().includes('journalEntries.list')) {
      return createMockQueryResponse(mockEntries)
    }
    if (api.toString().includes('relationships.list')) {
      return createMockQueryResponse([
        { _id: 'rel_1', name: 'Sarah', type: 'friend' },
      ])
    }
    return createMockQueryResponse(null)
  })

  // Mock mutation responses
  mockUseMutation.mockImplementation((api: any) => {
    if (api.toString().includes('journalEntries.create')) {
      return createMockMutation(args =>
        Promise.resolve({ ...args, _id: 'new_entry_id', createdAt: Date.now() })
      )
    }
    return createMockMutation()
  })
}
```

#### Convex Test Client Setup

```typescript
// test-utils/convex-test-client.ts

import { ConvexReactClient } from 'convex/react'
import { ConvexTestClient } from 'convex/testing'

export class ConvexTestEnvironment {
  private testClient: ConvexTestClient
  private reactClient: ConvexReactClient

  constructor() {
    this.testClient = new ConvexTestClient({
      deployment: process.env.CONVEX_TEST_DEPLOYMENT_URL!,
    })

    this.reactClient = new ConvexReactClient(
      process.env.CONVEX_TEST_DEPLOYMENT_URL!
    )
  }

  async setupTestData() {
    // Create test users
    const testUser = await this.testClient.mutation(api.users.create, {
      name: 'Test User',
      email: 'test@example.com',
      clerkId: 'test_clerk_id',
    })

    // Create test relationships
    const testRelationship = await this.testClient.mutation(
      api.relationships.create,
      {
        userId: testUser,
        name: 'Test Friend',
        type: 'friend',
      }
    )

    // Create test journal entries
    const testEntry = await this.testClient.mutation(
      api.journalEntries.create,
      {
        userId: testUser,
        relationshipId: testRelationship,
        content: 'Test journal entry content for integration testing',
        mood: 'happy',
      }
    )

    return {
      testUser,
      testRelationship,
      testEntry,
    }
  }

  async cleanup() {
    // Clean up test data
    await this.testClient.cleanup()
  }

  getReactClient() {
    return this.reactClient
  }
}

// Integration test helper
export const withConvexTestEnvironment = async (
  testFn: (env: ConvexTestEnvironment) => Promise<void>
) => {
  const env = new ConvexTestEnvironment()
  try {
    await env.setupTestData()
    await testFn(env)
  } finally {
    await env.cleanup()
  }
}
```

### Clerk Authentication Mocking

#### Clerk Mock Setup

```typescript
// test-utils/clerk-mocks.ts

import { jest } from '@jest/globals'

export const mockClerkAuth = () => {
  const mockUser = {
    id: 'test_user_123',
    firstName: 'Test',
    lastName: 'User',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    createdAt: Date.now(),
  }

  const mockUseUser = jest.fn(() => ({
    user: mockUser,
    isLoaded: true,
    isSignedIn: true,
  }))

  const mockUseAuth = jest.fn(() => ({
    userId: 'test_user_123',
    sessionId: 'test_session_123',
    isLoaded: true,
    isSignedIn: true,
    signOut: jest.fn(),
  }))

  const mockUseSignIn = jest.fn(() => ({
    signIn: {
      create: jest.fn(),
      prepareFirstFactor: jest.fn(),
      attemptFirstFactor: jest.fn(),
    },
    isLoaded: true,
  }))

  const mockUseSignUp = jest.fn(() => ({
    signUp: {
      create: jest.fn(),
      prepareEmailAddressVerification: jest.fn(),
      attemptEmailAddressVerification: jest.fn(),
    },
    isLoaded: true,
  }))

  jest.mock('@clerk/nextjs', () => ({
    useUser: mockUseUser,
    useAuth: mockUseAuth,
    useSignIn: mockUseSignIn,
    useSignUp: mockUseSignUp,
    ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
    SignInButton: ({ children }: { children: React.ReactNode }) => (
      <button>{children || 'Sign In'}</button>
    ),
    SignUpButton: ({ children }: { children: React.ReactNode }) => (
      <button>{children || 'Sign Up'}</button>
    ),
    UserButton: () => <button>User Menu</button>,
  }))

  return {
    mockUseUser,
    mockUseAuth,
    mockUseSignIn,
    mockUseSignUp,
    mockUser,
  }
}

// Clerk webhook testing
export const createMockClerkWebhookEvent = (type: string, userData: any) => ({
  type,
  data: {
    id: userData.id || 'clerk_user_123',
    email_addresses: [{ email_address: userData.email || 'test@example.com' }],
    first_name: userData.firstName || 'Test',
    last_name: userData.lastName || 'User',
    created_at: userData.createdAt || Date.now(),
    ...userData,
  },
  object: 'event',
  created: Date.now(),
})
```

### AI Service Mocking

#### Gemini AI Client Mocking

```typescript
// test-utils/ai-mocks.ts

import { jest } from '@jest/globals'

export const mockGeminiClient = () => {
  const mockAnalyzeJournalEntry = jest.fn()
  const mockGenerateInsights = jest.fn()
  const mockExtractPatterns = jest.fn()

  jest.mock('@/lib/ai/gemini-client', () => ({
    GeminiClient: jest.fn().mockImplementation(() => ({
      analyzeJournalEntry: mockAnalyzeJournalEntry,
      generateInsights: mockGenerateInsights,
      extractPatterns: mockExtractPatterns,
    })),
    createGeminiClient: jest.fn(() => ({
      analyzeJournalEntry: mockAnalyzeJournalEntry,
      generateInsights: mockGenerateInsights,
      extractPatterns: mockExtractPatterns,
    })),
  }))

  // Default mock implementations
  mockAnalyzeJournalEntry.mockImplementation((content: string) =>
    Promise.resolve({
      sentimentScore: 0.7,
      emotionalKeywords: ['happy', 'excited', 'grateful'],
      confidenceLevel: 0.9,
      reasoning: 'The entry expresses positive emotions and gratitude',
      patterns: {
        recurring_themes: ['gratitude', 'communication'],
        emotional_triggers: ['quality time'],
        communication_style: 'open and honest',
        relationship_dynamics: ['supportive', 'collaborative'],
      },
    })
  )

  mockGenerateInsights.mockImplementation((entries: any[]) =>
    Promise.resolve([
      {
        type: 'pattern_recognition',
        title: 'Improved Communication Pattern',
        description: 'Your communication has been more open and frequent',
        confidence: 0.85,
        actionableSteps: [
          'Continue sharing daily experiences',
          'Ask more open-ended questions',
        ],
      },
    ])
  )

  return {
    mockAnalyzeJournalEntry,
    mockGenerateInsights,
    mockExtractPatterns,
  }
}

// AI rate limiting simulation
export const simulateRateLimitError = (mockFn: jest.Mock) => {
  mockFn.mockRejectedValueOnce(
    new Error('Rate limit exceeded. Please try again later.')
  )
}

// AI processing delay simulation
export const simulateProcessingDelay = (
  mockFn: jest.Mock,
  delay: number = 2000
) => {
  mockFn.mockImplementation(
    (...args) =>
      new Promise(resolve =>
        setTimeout(
          () => resolve(mockFn.getMockImplementation()(...args)),
          delay
        )
      )
  )
}
```

---

## Convex Real-time Testing

### Real-time Subscription Testing

#### Testing Real-time Updates

```typescript
// test-utils/real-time-testing.ts

import { renderHook, act } from '@testing-library/react'
import { ConvexProvider } from 'convex/react'
import { ConvexTestClient } from 'convex/testing'

export class RealTimeTestHarness {
  private convexClient: ConvexTestClient
  private subscriptions: Map<string, any[]> = new Map()

  constructor() {
    this.convexClient = new ConvexTestClient(process.env.CONVEX_TEST_URL!)
  }

  // Subscribe to real-time updates
  async subscribeToUpdates<T>(queryName: string, args: any): Promise<T[]> {
    const updates: T[] = []

    const { result } = renderHook(
      () => useQuery(api[queryName], args),
      {
        wrapper: ({ children }) => (
          <ConvexProvider client={this.convexClient}>
            {children}
          </ConvexProvider>
        ),
      }
    )

    // Store subscription for cleanup
    this.subscriptions.set(queryName, updates)

    return updates
  }

  // Trigger data change and verify real-time update
  async triggerUpdateAndVerify<T>(
    mutation: string,
    mutationArgs: any,
    expectedUpdate: Partial<T>,
    subscriptionKey: string
  ) {
    const initialData = this.subscriptions.get(subscriptionKey) || []

    // Trigger mutation
    await act(async () => {
      await this.convexClient.mutation(api[mutation], mutationArgs)
    })

    // Verify real-time update occurred
    await waitFor(() => {
      const currentData = this.subscriptions.get(subscriptionKey) || []
      expect(currentData.length).toBeGreaterThan(initialData.length)
      expect(currentData).toContainEqual(
        expect.objectContaining(expectedUpdate)
      )
    })
  }

  cleanup() {
    this.subscriptions.clear()
  }
}

// Example: Testing journal entry real-time updates
export const testJournalEntryRealTimeUpdates = async () => {
  const harness = new RealTimeTestHarness()

  try {
    // Subscribe to journal entries
    await harness.subscribeToUpdates('journalEntries.list', { userId: 'test_user' })

    // Create new entry and verify real-time update
    await harness.triggerUpdateAndVerify(
      'journalEntries.create',
      {
        userId: 'test_user',
        content: 'Real-time test entry',
        relationshipId: 'test_rel',
      },
      {
        content: 'Real-time test entry',
        userId: 'test_user',
      },
      'journalEntries.list'
    )
  } finally {
    harness.cleanup()
  }
}
```

#### Connection State Testing

```typescript
// Connection state and offline testing
export const testConvexConnectionStates = () => {
  describe('Convex Connection States', () => {
    test('handles connection loss gracefully', async () => {
      const { result } = renderHook(() => useConvexAuth())

      // Simulate connection loss
      await act(async () => {
        mockConvexClient.simulateConnectionLoss()
      })

      expect(result.current.isOnline).toBe(false)

      // Verify offline UI state
      render(<Dashboard />)
      expect(screen.getByText('Connection lost. Retrying...')).toBeInTheDocument()

      // Simulate reconnection
      await act(async () => {
        mockConvexClient.simulateReconnection()
      })

      expect(result.current.isOnline).toBe(true)
      expect(screen.queryByText('Connection lost')).not.toBeInTheDocument()
    })

    test('queues mutations during offline state', async () => {
      const { result } = renderHook(() => useMutation(api.journalEntries.create))

      // Go offline
      mockConvexClient.simulateConnectionLoss()

      // Attempt mutation while offline
      await act(async () => {
        result.current({
          content: 'Offline entry',
          userId: 'test_user',
        })
      })

      // Verify mutation is queued
      expect(mockConvexClient.getQueuedMutations()).toHaveLength(1)

      // Reconnect and verify mutation executes
      await act(async () => {
        mockConvexClient.simulateReconnection()
      })

      await waitFor(() => {
        expect(mockConvexClient.getQueuedMutations()).toHaveLength(0)
      })
    })
  })
}
```

---

## AI Processing Pipeline Testing

### AI Analysis Testing Framework

#### DSPy Pipeline Testing

```typescript
// test-utils/ai-pipeline-testing.ts

export class AIPipelineTestSuite {
  private mockGeminiClient: any
  private testEntries: any[]

  constructor() {
    this.mockGeminiClient = mockGeminiClient()
    this.testEntries = this.generateTestEntries()
  }

  private generateTestEntries() {
    return [
      {
        content:
          'Had an amazing dinner with Sarah. We talked for hours about our dreams.',
        expectedSentiment: 0.8,
        expectedKeywords: ['amazing', 'dreams', 'talked'],
        expectedPatterns: ['quality time', 'deep conversation'],
      },
      {
        content:
          'Another argument with Mike about money. This is getting frustrating.',
        expectedSentiment: -0.6,
        expectedKeywords: ['argument', 'frustrating', 'money'],
        expectedPatterns: ['conflict', 'financial stress'],
      },
      {
        content: 'Quiet evening at home. Nothing special happened today.',
        expectedSentiment: 0.0,
        expectedKeywords: ['quiet', 'home'],
        expectedPatterns: ['routine', 'low activity'],
      },
    ]
  }

  async testSentimentAnalysisAccuracy() {
    for (const entry of this.testEntries) {
      const analysis = await analyzeJournalEntry(entry.content)

      // Test sentiment score accuracy (within 0.2 range)
      expect(analysis.sentimentScore).toBeCloseTo(entry.expectedSentiment, 1)

      // Test keyword extraction
      entry.expectedKeywords.forEach(keyword => {
        expect(analysis.emotionalKeywords).toContain(keyword)
      })

      // Test pattern recognition
      entry.expectedPatterns.forEach(pattern => {
        expect(analysis.patterns.recurring_themes).toContain(pattern)
      })
    }
  }

  async testErrorHandling() {
    // Test API timeout
    this.mockGeminiClient.mockAnalyzeJournalEntry.mockRejectedValueOnce(
      new Error('Request timeout')
    )

    const result = await analyzeJournalEntry('Test content')
    expect(result).toHaveProperty('error')
    expect(result.error).toContain('timeout')

    // Test invalid response format
    this.mockGeminiClient.mockAnalyzeJournalEntry.mockResolvedValueOnce({
      invalid: 'response',
    })

    const invalidResult = await analyzeJournalEntry('Test content')
    expect(invalidResult).toHaveProperty('error')
    expect(invalidResult.error).toContain('Invalid response format')
  }

  async testRateLimitHandling() {
    // Simulate rate limit
    simulateRateLimitError(this.mockGeminiClient.mockAnalyzeJournalEntry)

    const result = await analyzeJournalEntry('Test content')
    expect(result).toHaveProperty('rateLimited', true)
    expect(result).toHaveProperty('retryAfter')
  }

  async testBatchProcessing() {
    const batchEntries = Array.from({ length: 10 }, (_, i) => ({
      id: `entry_${i}`,
      content: `Test entry ${i} with varying emotional content`,
    }))

    const results = await processBatchAnalysis(batchEntries)

    expect(results).toHaveLength(10)
    results.forEach((result, index) => {
      expect(result.entryId).toBe(`entry_${index}`)
      expect(result.analysis).toHaveProperty('sentimentScore')
      expect(result.analysis).toHaveProperty('confidenceLevel')
    })
  }
}
```

#### AI Cost and Performance Testing

```typescript
// AI performance and cost monitoring
export const testAIPerformanceMetrics = () => {
  describe('AI Performance Metrics', () => {
    test('tracks processing time and cost', async () => {
      const performanceMonitor = new AIPerformanceMonitor()

      const entry = {
        content: 'Test entry for performance monitoring',
        userId: 'test_user',
      }

      const startTime = performance.now()
      const analysis = await analyzeJournalEntry(entry.content)
      const endTime = performance.now()

      const metrics = performanceMonitor.getMetrics()

      expect(metrics.processingTime).toBeGreaterThan(0)
      expect(metrics.processingTime).toBeLessThan(5000) // 5 second max
      expect(metrics.tokensUsed).toBeGreaterThan(0)
      expect(metrics.estimatedCost).toBeGreaterThan(0)
      expect(metrics.apiCallCount).toBe(1)
    })

    test('monitors daily cost limits', async () => {
      const costTracker = new AICostTracker('test_user')

      // Simulate multiple API calls throughout the day
      for (let i = 0; i < 100; i++) {
        await costTracker.trackAPICall({
          tokensUsed: 150,
          estimatedCost: 0.002,
        })
      }

      const dailyCost = await costTracker.getDailyCost()
      expect(dailyCost).toBeGreaterThan(0)

      // Test cost limit enforcement
      if (dailyCost > DAILY_COST_LIMIT) {
        await expect(analyzeJournalEntry('Test content')).rejects.toThrow(
          'Daily AI cost limit exceeded'
        )
      }
    })
  })
}
```

---

## Authentication Flow Testing

### Clerk + Convex Integration Testing

#### Complete Authentication Flow Testing

```typescript
// test-utils/auth-flow-testing.ts

export class AuthenticationFlowTester {
  private page: Page
  private testEmail: string
  private testPassword: string

  constructor(page: Page) {
    this.page = page
    this.testEmail = `test_${Date.now()}@example.com`
    this.testPassword = 'TestPassword123!'
  }

  async testCompleteSignUpFlow() {
    // Navigate to sign up
    await this.page.goto('/sign-up')

    // Fill sign up form
    await this.page.getByRole('textbox', { name: 'Email' }).fill(this.testEmail)
    await this.page
      .getByRole('textbox', { name: 'Password' })
      .fill(this.testPassword)
    await this.page.getByRole('button', { name: 'Sign up' }).click()

    // Handle email verification (in test environment)
    await this.handleEmailVerification()

    // Verify redirect to onboarding
    await expect(this.page).toHaveURL(/\/onboarding/)

    // Verify Convex user creation
    const convexUser = await this.verifyConvexUserCreated()
    expect(convexUser).toBeDefined()
    expect(convexUser.email).toBe(this.testEmail)

    return { email: this.testEmail, convexUser }
  }

  async testSignInFlow() {
    // Navigate to sign in
    await this.page.goto('/sign-in')

    // Fill sign in form
    await this.page.getByRole('textbox', { name: 'Email' }).fill(this.testEmail)
    await this.page
      .getByRole('textbox', { name: 'Password' })
      .fill(this.testPassword)
    await this.page.getByRole('button', { name: 'Sign in' }).click()

    // Verify successful sign in
    await expect(this.page).toHaveURL(/\/dashboard/)

    // Verify auth state
    const authState = await this.page.evaluate(
      () => window.__CLERK_AUTH_STATE__
    )
    expect(authState.isSignedIn).toBe(true)
    expect(authState.user.primaryEmailAddress.emailAddress).toBe(this.testEmail)
  }

  async testSignOutFlow() {
    // Click user menu
    await this.page.getByTestId('user-button').click()

    // Click sign out
    await this.page.getByRole('button', { name: 'Sign out' }).click()

    // Verify redirect to home page
    await expect(this.page).toHaveURL('/')

    // Verify auth state cleared
    const authState = await this.page.evaluate(
      () => window.__CLERK_AUTH_STATE__
    )
    expect(authState.isSignedIn).toBe(false)
  }

  async testProtectedRouteAccess() {
    // Try to access protected route while signed out
    await this.page.goto('/dashboard')

    // Should redirect to sign in
    await expect(this.page).toHaveURL(/\/sign-in/)

    // Sign in and try again
    await this.testSignInFlow()
    await this.page.goto('/dashboard')

    // Should allow access
    await expect(this.page).toHaveURL(/\/dashboard/)
    await expect(
      this.page.getByText('Your Relationship Dashboard')
    ).toBeVisible()
  }

  private async handleEmailVerification() {
    // In test environment, auto-verify email
    if (process.env.NODE_ENV === 'test') {
      // Simulate email verification click
      await this.page.waitForSelector('[data-testid="verification-code-input"]')
      await this.page.getByTestId('verification-code-input').fill('123456')
      await this.page.getByRole('button', { name: 'Verify' }).click()
    } else {
      // Real email verification flow
      await this.page.waitForSelector('[data-testid="check-email-message"]')
      // User would need to check email and click verification link
    }
  }

  private async verifyConvexUserCreated() {
    // Query Convex to verify user was created
    const response = await fetch('/api/test/verify-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.testEmail }),
    })

    return await response.json()
  }
}
```

#### Session Management Testing

```typescript
// Session and token testing
export const testSessionManagement = () => {
  describe('Session Management', () => {
    test('maintains session across page refreshes', async ({ page }) => {
      const authTester = new AuthenticationFlowTester(page)

      // Sign in
      await authTester.testSignInFlow()

      // Refresh page
      await page.reload()

      // Verify still signed in
      await expect(page.getByText('Your Relationship Dashboard')).toBeVisible()

      // Verify Convex connection maintained
      await expect(page.getByTestId('health-score-card')).toBeVisible()
    })

    test('handles session expiration', async ({ page }) => {
      const authTester = new AuthenticationFlowTester(page)

      // Sign in
      await authTester.testSignInFlow()

      // Simulate session expiration
      await page.evaluate(() => {
        // Clear Clerk session
        localStorage.removeItem('__clerk_session')
        sessionStorage.clear()
      })

      // Try to access protected content
      await page.goto('/journal/new')

      // Should redirect to sign in
      await expect(page).toHaveURL(/\/sign-in/)
    })

    test('handles concurrent sessions', async ({ browser }) => {
      const context1 = await browser.newContext()
      const context2 = await browser.newContext()

      const page1 = await context1.newPage()
      const page2 = await context2.newPage()

      const authTester1 = new AuthenticationFlowTester(page1)
      const authTester2 = new AuthenticationFlowTester(page2)

      // Sign in with different users
      await authTester1.testCompleteSignUpFlow()
      await authTester2.testCompleteSignUpFlow()

      // Verify both sessions work independently
      await page1.goto('/dashboard')
      await page2.goto('/dashboard')

      await expect(page1.getByText('Your Relationship Dashboard')).toBeVisible()
      await expect(page2.getByText('Your Relationship Dashboard')).toBeVisible()

      // Verify data isolation
      const user1Data = await page1.evaluate(() => window.__USER_DATA__)
      const user2Data = await page2.evaluate(() => window.__USER_DATA__)

      expect(user1Data.userId).not.toBe(user2Data.userId)
    })
  })
}
```

---

## Test Data Management

### Test User Personas

#### Comprehensive Test User Setup

```typescript
// test-utils/test-personas.ts

export interface TestPersona {
  id: string
  email: string
  name: string
  tier: 'free' | 'premium'
  relationships: TestRelationship[]
  journalEntries: TestJournalEntry[]
  healthScores: TestHealthScore[]
  onboardingCompleted: boolean
  preferences: TestUserPreferences
}

export interface TestRelationship {
  id: string
  name: string
  type: 'partner' | 'family' | 'friend' | 'colleague'
  isActive: boolean
  metadata?: {
    importance?: 'high' | 'medium' | 'low'
    anniversary?: number
  }
}

export interface TestJournalEntry {
  id: string
  relationshipId: string
  content: string
  mood?: string
  tags?: string[]
  isPrivate?: boolean
  createdAt: number
}

export const TEST_PERSONAS: Record<string, TestPersona> = {
  NEW_USER: {
    id: 'new_user_001',
    email: 'newuser@test.com',
    name: 'New User',
    tier: 'free',
    relationships: [],
    journalEntries: [],
    healthScores: [],
    onboardingCompleted: false,
    preferences: {
      theme: 'light',
      notifications: true,
    },
  },

  ACTIVE_USER: {
    id: 'active_user_001',
    email: 'activeuser@test.com',
    name: 'Active User',
    tier: 'free',
    onboardingCompleted: true,
    relationships: [
      {
        id: 'rel_001',
        name: 'Sarah Johnson',
        type: 'friend',
        isActive: true,
        metadata: { importance: 'high' },
      },
      {
        id: 'rel_002',
        name: 'Mike Chen',
        type: 'colleague',
        isActive: true,
        metadata: { importance: 'medium' },
      },
      {
        id: 'rel_003',
        name: 'Emma Wilson',
        type: 'family',
        isActive: true,
        metadata: { importance: 'high' },
      },
    ],
    journalEntries: generateJournalEntries('active_user_001', 15),
    healthScores: generateHealthScores(['rel_001', 'rel_002', 'rel_003']),
    preferences: {
      theme: 'light',
      notifications: true,
      reminderSettings: {
        enabled: true,
        frequency: 'daily',
        preferredTime: '19:00',
      },
    },
  },

  POWER_USER: {
    id: 'power_user_001',
    email: 'poweruser@test.com',
    name: 'Power User',
    tier: 'premium',
    onboardingCompleted: true,
    relationships: generateRelationships(10),
    journalEntries: generateJournalEntries('power_user_001', 200),
    healthScores: generateHealthScores(
      generateRelationships(10).map(r => r.id)
    ),
    preferences: {
      theme: 'dark',
      notifications: true,
      aiAnalysisEnabled: true,
      reminderSettings: {
        enabled: true,
        frequency: 'every2days',
        preferredTime: '18:30',
        reminderTypes: {
          gentleNudge: true,
          relationshipFocus: true,
          healthScoreAlerts: true,
        },
      },
    },
  },

  EDGE_CASE_USER: {
    id: 'edge_user_001',
    email: 'edgecase@test.com',
    name: 'Edge Case User',
    tier: 'free',
    onboardingCompleted: true,
    relationships: [
      {
        id: 'rel_edge_001',
        name: 'Name with Émojis 😊 and Spéciäl Characters',
        type: 'friend',
        isActive: true,
      },
      {
        id: 'rel_edge_002',
        name: 'Very Long Relationship Name That Exceeds Normal Length Expectations',
        type: 'family',
        isActive: false, // Inactive relationship
      },
    ],
    journalEntries: [
      {
        id: 'entry_edge_001',
        relationshipId: 'rel_edge_001',
        content:
          'Entry with special characters: áéíóú ñ ç 中文 العربية русский',
        mood: 'confused',
        tags: ['special-chars', 'edge-case', 'unicode-test'],
        isPrivate: true,
        createdAt: Date.now() - 86400000,
      },
      {
        id: 'entry_edge_002',
        relationshipId: 'rel_edge_001',
        content: 'Very short entry',
        createdAt: Date.now() - 3600000,
      },
      {
        id: 'entry_edge_003',
        relationshipId: 'rel_edge_001',
        content: 'A'.repeat(5000), // Very long entry
        tags: Array.from({ length: 20 }, (_, i) => `tag-${i}`), // Many tags
        createdAt: Date.now() - 1800000,
      },
    ],
    healthScores: [],
    preferences: {
      theme: 'dark',
      notifications: false,
      dataRetention: '1year',
    },
  },
}

// Helper functions for generating test data
function generateJournalEntries(
  userId: string,
  count: number
): TestJournalEntry[] {
  const moods = ['happy', 'sad', 'excited', 'calm', 'frustrated', 'grateful']
  const templates = [
    'Had a great conversation with {name} about {topic}',
    'Feeling {emotion} after spending time with {name}',
    '{name} and I worked through a difficult situation today',
    'Enjoyed a quiet evening with {name}',
    'Celebrated {event} with {name} - it was wonderful',
  ]

  return Array.from({ length: count }, (_, i) => ({
    id: `entry_${userId}_${i}`,
    relationshipId: `rel_00${(i % 3) + 1}`, // Rotate through relationships
    content: generateRealisticContent(templates, i),
    mood: moods[i % moods.length],
    tags: generateRandomTags(),
    isPrivate: Math.random() > 0.7,
    createdAt: Date.now() - i * 86400000, // Spread over time
  }))
}

function generateHealthScores(relationshipIds: string[]): TestHealthScore[] {
  return relationshipIds.map(relId => ({
    relationshipId: relId,
    score: Math.floor(Math.random() * 40) + 60, // 60-100 range
    trendDirection: ['improving', 'stable', 'declining'][
      Math.floor(Math.random() * 3)
    ],
    factorBreakdown: {
      communication: Math.floor(Math.random() * 30) + 70,
      emotional_support: Math.floor(Math.random() * 30) + 70,
      conflict_resolution: Math.floor(Math.random() * 30) + 70,
      trust_intimacy: Math.floor(Math.random() * 30) + 70,
      shared_growth: Math.floor(Math.random() * 30) + 70,
    },
    lastCalculated: Date.now() - Math.floor(Math.random() * 86400000),
  }))
}
```

#### Test Data Seeding and Cleanup

```typescript
// test-utils/data-seeding.ts

export class TestDataManager {
  private convexClient: ConvexTestClient
  private seededData: Map<string, any[]> = new Map()

  constructor() {
    this.convexClient = new ConvexTestClient(process.env.CONVEX_TEST_URL!)
  }

  async seedPersona(personaKey: string): Promise<TestPersona> {
    const persona = TEST_PERSONAS[personaKey]
    if (!persona) {
      throw new Error(`Unknown persona: ${personaKey}`)
    }

    // Create user
    const user = await this.convexClient.mutation(api.users.create, {
      name: persona.name,
      email: persona.email,
      clerkId: `clerk_${persona.id}`,
      tier: persona.tier,
      onboardingCompleted: persona.onboardingCompleted,
      preferences: persona.preferences,
    })

    // Create relationships
    const relationships = []
    for (const rel of persona.relationships) {
      const relationship = await this.convexClient.mutation(
        api.relationships.create,
        {
          userId: user,
          name: rel.name,
          type: rel.type,
          isActive: rel.isActive,
          metadata: rel.metadata,
        }
      )
      relationships.push(relationship)
    }

    // Create journal entries
    const journalEntries = []
    for (const entry of persona.journalEntries) {
      const relationshipId = relationships.find(
        r =>
          r.name ===
          persona.relationships.find(pr => pr.id === entry.relationshipId)?.name
      )?._id

      if (relationshipId) {
        const journalEntry = await this.convexClient.mutation(
          api.journalEntries.create,
          {
            userId: user,
            relationshipId,
            content: entry.content,
            mood: entry.mood,
            tags: entry.tags,
            isPrivate: entry.isPrivate,
            createdAt: entry.createdAt,
          }
        )
        journalEntries.push(journalEntry)
      }
    }

    // Create health scores
    for (const healthScore of persona.healthScores) {
      const relationshipId = relationships.find(
        r =>
          r.name ===
          persona.relationships.find(pr => pr.id === healthScore.relationshipId)
            ?.name
      )?._id

      if (relationshipId) {
        await this.convexClient.mutation(api.healthScores.create, {
          userId: user,
          relationshipId,
          score: healthScore.score,
          trendDirection: healthScore.trendDirection,
          factorBreakdown: healthScore.factorBreakdown,
          lastCalculated: healthScore.lastCalculated,
        })
      }
    }

    // Track seeded data for cleanup
    this.seededData.set(personaKey, [user, ...relationships, ...journalEntries])

    return {
      ...persona,
      convexUserId: user,
      convexRelationships: relationships,
      convexJournalEntries: journalEntries,
    }
  }

  async seedAllPersonas(): Promise<Record<string, TestPersona>> {
    const seededPersonas: Record<string, TestPersona> = {}

    for (const [key, persona] of Object.entries(TEST_PERSONAS)) {
      seededPersonas[key] = await this.seedPersona(key)
    }

    return seededPersonas
  }

  async cleanupPersona(personaKey: string) {
    const seededItems = this.seededData.get(personaKey)
    if (seededItems) {
      // Delete in reverse order to handle dependencies
      for (const item of seededItems.reverse()) {
        await this.deleteConvexDocument(item._id)
      }
      this.seededData.delete(personaKey)
    }
  }

  async cleanupAll() {
    for (const personaKey of this.seededData.keys()) {
      await this.cleanupPersona(personaKey)
    }
  }

  private async deleteConvexDocument(documentId: string) {
    try {
      await this.convexClient.mutation(api.admin.deleteDocument, {
        id: documentId,
      })
    } catch (error) {
      console.warn(`Failed to delete document ${documentId}:`, error)
    }
  }
}

// Test helper for using personas in tests
export const withTestPersona = async (
  personaKey: string,
  testFn: (persona: TestPersona) => Promise<void>
) => {
  const dataManager = new TestDataManager()

  try {
    const persona = await dataManager.seedPersona(personaKey)
    await testFn(persona)
  } finally {
    await dataManager.cleanupPersona(personaKey)
  }
}

// Usage in tests
describe('Journal Entry Features', () => {
  test('active user can create and view entries', async () => {
    await withTestPersona('ACTIVE_USER', async persona => {
      // Test implementation using seeded persona data
      const { result } = renderHook(() =>
        useQuery(api.journalEntries.list, { userId: persona.convexUserId })
      )

      expect(result.current).toHaveLength(15) // Active user has 15 entries
    })
  })
})
```

---

## Testing Tools & Frameworks

### Jest Configuration for Resonant

#### Complete Jest Setup

```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Module name mapping
  moduleNameMapping: {
    '^@/convex/_generated/api$': '<rootDir>/convex/_generated/api',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/test-utils/(.*)$': '<rootDir>/test-utils/$1',
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/types/**',
    '!src/convex/_generated/**',
  ],

  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/components/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './src/lib/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },

  // Test timeout
  testTimeout: 10000,

  // Transform configuration for various file types
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/test-results/',
  ],

  // Global variables
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: 'test-results',
        filename: 'report.html',
      },
    ],
  ],
}

module.exports = createJestConfig(customJestConfig)
```

#### Jest Setup File

```javascript
// jest.setup.js
import '@testing-library/jest-dom'
import 'jest-canvas-mock'

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock Chart.js
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
}))

// Mock Recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}))

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/test-path',
}))

// Global test utilities
global.testUtils = {
  createMockUser: () => ({
    id: 'test_user_123',
    email: 'test@example.com',
    name: 'Test User',
  }),

  createMockJournalEntry: (overrides = {}) => ({
    _id: 'entry_123',
    userId: 'test_user_123',
    relationshipId: 'rel_123',
    content: 'Test journal entry content',
    mood: 'happy',
    tags: ['test'],
    isPrivate: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }),

  createMockRelationship: (overrides = {}) => ({
    _id: 'rel_123',
    userId: 'test_user_123',
    name: 'Test Friend',
    type: 'friend',
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }),
}

// Suppress console warnings in tests
const originalWarn = console.warn
console.warn = (...args) => {
  if (args[0]?.includes?.('React Router')) return
  if (args[0]?.includes?.('act()')) return
  originalWarn(...args)
}
```

### Playwright Configuration

#### Advanced Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.test' })

export default defineConfig({
  testDir: './tests/e2e',

  // Parallel execution
  fullyParallel: true,
  forbidOnly: !!process.env.CI,

  // Retry configuration
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 2,

  // Global setup/teardown
  globalSetup: require.resolve('./tests/setup/global-setup.ts'),
  globalTeardown: require.resolve('./tests/setup/global-teardown.ts'),

  // Reporter configuration
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['html', { outputFolder: 'test-results/html-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  // Global test configuration
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Tracing and debugging
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Timeouts
    actionTimeout: 15000,
    navigationTimeout: 30000,

    // Browser configuration
    ignoreHTTPSErrors: true,
    colorScheme: 'light',

    // Viewport
    viewport: { width: 1280, height: 720 },

    // Geolocation for testing location features
    geolocation: { longitude: -122.4194, latitude: 37.7749 },
    permissions: ['geolocation'],

    // Locale
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
  },

  // Browser projects
  projects: [
    // Desktop browsers
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.test\.ts/,
    },
    {
      name: 'Desktop Firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /.*\.test\.ts/,
    },
    {
      name: 'Desktop Safari',
      use: { ...devices['Desktop Safari'] },
      testMatch: /.*\.test\.ts/,
    },

    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: /.*\.mobile\.test\.ts/,
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testMatch: /.*\.mobile\.test\.ts/,
    },

    // Visual regression testing
    {
      name: 'Visual Regression',
      use: {
        ...devices['Desktop Chrome'],
        screenshot: 'only-on-failure',
      },
      testMatch: /.*\.visual\.test\.ts/,
    },

    // Performance testing
    {
      name: 'Performance',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-features=NetworkService,NetworkServiceLogging'],
        },
      },
      testMatch: /.*\.performance\.test\.ts/,
    },
  ],

  // Output directories
  outputDir: 'test-results/artifacts',

  // Test timeouts
  timeout: 120000,
  expect: {
    timeout: 15000,
    toHaveScreenshot: { threshold: 0.2, maxDiffPixels: 1000 },
  },

  // Development server
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
      },
    },
    {
      command: 'npm run convex:dev',
      url: 'http://localhost:3210', // Convex dashboard
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
})
```

### Testing Utilities and Helpers

#### React Testing Library Custom Renders

```typescript
// test-utils/custom-renders.tsx

import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ConvexProvider } from 'convex/react'
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from '@/components/providers/theme-provider'

// Mock Convex client
const mockConvexClient = {
  setAuth: jest.fn(),
  clearAuth: jest.fn(),
  query: jest.fn(),
  mutation: jest.fn(),
  action: jest.fn(),
}

// Mock Clerk
const mockClerkConfig = {
  publishableKey: 'pk_test_mock',
  appearance: {},
}

// Create a custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  convexClient?: any
  clerkConfig?: any
  initialTheme?: 'light' | 'dark'
  user?: any
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    convexClient = mockConvexClient,
    clerkConfig = mockClerkConfig,
    initialTheme = 'light',
    user = null,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ClerkProvider {...clerkConfig}>
        <ConvexProvider client={convexClient}>
          <ThemeProvider defaultTheme={initialTheme}>
            {children}
          </ThemeProvider>
        </ConvexProvider>
      </ClerkProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Custom hooks testing
export function renderHookWithProviders<T>(
  hook: () => T,
  options: CustomRenderOptions = {}
) {
  const { result } = renderHook(hook, {
    wrapper: ({ children }) => (
      <ConvexProvider client={options.convexClient || mockConvexClient}>
        <ClerkProvider {...(options.clerkConfig || mockClerkConfig)}>
          {children}
        </ClerkProvider>
      </ConvexProvider>
    ),
  })

  return { result }
}

// Chart testing utilities
export function renderChart(
  ChartComponent: React.ComponentType<any>,
  props: any = {}
) {
  // Mock canvas context for Chart.js
  const mockContext = {
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Array(4) })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => ({ data: new Array(4) })),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
  }

  HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext)

  return renderWithProviders(<ChartComponent {...props} />)
}

// Form testing utilities
export async function fillAndSubmitForm(
  formData: Record<string, string | boolean>,
  submitButtonText: string = 'Submit'
) {
  const user = userEvent.setup()

  for (const [fieldName, value] of Object.entries(formData)) {
    const field = screen.getByLabelText(new RegExp(fieldName, 'i'))

    if (typeof value === 'boolean') {
      if (value) {
        await user.click(field)
      }
    } else {
      await user.clear(field)
      await user.type(field, value)
    }
  }

  const submitButton = screen.getByRole('button', { name: new RegExp(submitButtonText, 'i') })
  await user.click(submitButton)
}

// Authentication testing utilities
export function mockAuthenticatedUser(user: any = {}) {
  const mockUser = {
    id: 'test_user_123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    ...user,
  }

  jest.mocked(useUser).mockReturnValue({
    user: mockUser,
    isLoaded: true,
    isSignedIn: true,
  })

  jest.mocked(useAuth).mockReturnValue({
    userId: mockUser.id,
    sessionId: 'test_session',
    isLoaded: true,
    isSignedIn: true,
    signOut: jest.fn(),
  })

  return mockUser
}

// Export commonly used testing utilities
export * from '@testing-library/react'
export * from '@testing-library/user-event'
export { default as userEvent } from '@testing-library/user-event'
```

This comprehensive test implementation guide provides practical tools and patterns for testing the Resonant application across all layers of the stack. The mock strategies, test utilities, and configuration examples are specifically tailored to work with Next.js 15, Convex, Clerk, and the AI processing pipeline.
