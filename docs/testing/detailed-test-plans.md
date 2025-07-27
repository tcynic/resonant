# Detailed Test Plans

## Overview

This document provides comprehensive test plans for all major testing types in the Resonant application, including specific test scenarios, implementation details, and success criteria.

## Table of Contents

1. [Unit Testing Plan](#unit-testing-plan)
2. [Integration Testing Plan](#integration-testing-plan)
3. [End-to-End Testing Plan](#end-to-end-testing-plan)
4. [Performance Testing Plan](#performance-testing-plan)
5. [Security Testing Plan](#security-testing-plan)
6. [Accessibility Testing Plan](#accessibility-testing-plan)
7. [Visual Regression Testing Plan](#visual-regression-testing-plan)

---

## Unit Testing Plan

### Scope & Objectives
- Test individual components, functions, and utilities in isolation
- Achieve 90%+ code coverage for critical paths
- Ensure TypeScript type safety and validation
- Test edge cases and error conditions

### Test Categories

#### 1. Component Testing (React Testing Library + Jest)

##### Journal Components
```typescript
// src/components/features/journal/__tests__/

describe('JournalEntryEditor', () => {
  // Form validation
  test('validates minimum content length')
  test('requires relationship selection')
  test('handles mood and tag selection')
  
  // User interactions
  test('auto-saves draft during typing')
  test('shows character count in real-time')
  test('preserves form state on navigation')
  
  // Edit mode
  test('pre-populates form with existing entry data')
  test('only sends changed fields on update')
  test('validates changes before submission')
  
  // Error handling
  test('displays validation errors clearly')
  test('handles save failures gracefully')
  test('recovers from network interruptions')
})

describe('MoodSelector', () => {
  test('displays all 10 mood options with emojis')
  test('handles selection and deselection')
  test('supports keyboard navigation')
  test('maintains selection state')
  test('triggers onChange callback correctly')
})

describe('TagInput', () => {
  test('adds tags on Enter or comma')
  test('prevents duplicate tags')
  test('validates tag format and length')
  test('shows tag suggestions based on history')
  test('handles special characters in tags')
  test('supports tag removal via backspace')
})

describe('RelationshipPicker', () => {
  test('displays relationships with photos/initials')
  test('supports multi-select functionality')
  test('filters relationships by search term')
  test('handles empty relationship list')
  test('respects privacy settings for display')
})
```

##### Dashboard Components
```typescript
// src/components/features/dashboard/__tests__/

describe('HealthScoreCard', () => {
  test('displays current health score with trend indicator')
  test('shows factor breakdown on hover/click')
  test('handles missing or incomplete data')
  test('calculates and displays score changes')
  test('renders appropriate visual indicators')
})

describe('TrendChart', () => {
  test('renders sentiment trend over time')
  test('handles data gaps gracefully')
  test('supports different time ranges')
  test('displays trend lines and moving averages')
  test('handles chart interactions (zoom, hover)')
  test('exports chart data and images')
})

describe('RecentActivity', () => {
  test('displays latest journal entries')
  test('shows relationship context')
  test('handles real-time updates')
  test('paginates large activity lists')
  test('filters by activity type')
})
```

##### Insights Components
```typescript
// src/components/features/insights/__tests__/

describe('SentimentTrendChart', () => {
  test('processes journal entry data correctly')
  test('calculates rolling averages')
  test('identifies sentiment patterns')
  test('handles missing mood data')
  test('renders chart with proper scaling')
})

describe('BaseChart', () => {
  test('applies consistent theming')
  test('handles responsive sizing')
  test('supports accessibility features')
  test('manages chart lifecycle properly')
  test('handles data updates without flickering')
})
```

#### 2. Hook Testing

##### Custom Hooks
```typescript
// src/hooks/__tests__/

describe('useAutoSave', () => {
  test('auto-saves after configurable delay')
  test('cancels pending saves on unmount')
  test('handles save errors with retry')
  test('provides save status and indicators')
  test('manages draft state properly')
})

describe('useJournalEntries', () => {
  test('fetches user journal entries')
  test('handles pagination correctly')
  test('filters by relationship and date')
  test('maintains sort order preferences')
  test('updates on real-time changes')
})

describe('useBrowserNotifications', () => {
  test('requests notification permissions')
  test('displays notifications at scheduled times')
  test('handles permission denied gracefully')
  test('manages notification queue')
  test('tracks notification interactions')
})
```

#### 3. Utility Function Testing

##### Validation Functions
```typescript
// src/lib/__tests__/validations.test.ts

describe('Journal Entry Validation', () => {
  test('validates content length requirements')
  test('sanitizes HTML and dangerous content')
  test('validates tag format and uniqueness')
  test('checks relationship ID validity')
  test('handles edge cases (empty, null, undefined)')
})

describe('Relationship Validation', () => {
  test('validates name requirements')
  test('enforces relationship type constraints')
  test('validates photo URL format')
  test('handles unicode characters in names')
})
```

##### AI Analysis Functions
```typescript
// src/lib/ai/__tests__/

describe('Sentiment Analysis', () => {
  test('analyzes positive sentiment correctly')
  test('identifies negative emotional patterns')
  test('handles neutral content appropriately')
  test('extracts relevant keywords')
  test('maintains confidence scores')
  
  // Edge cases
  test('handles empty or very short content')
  test('processes content with special characters')
  test('manages API timeout scenarios')
  test('falls back when AI service unavailable')
})

describe('Pattern Recognition', () => {
  test('identifies recurring themes in entries')
  test('detects emotional triggers')
  test('recognizes communication patterns')
  test('tracks relationship dynamics over time')
})

describe('Rate Limiting', () => {
  test('respects API rate limits')
  test('queues requests appropriately')
  test('implements exponential backoff')
  test('provides user feedback during delays')
})
```

##### Chart Utilities
```typescript
// src/lib/__tests__/chart-utils.test.ts

describe('Chart Data Processing', () => {
  test('aggregates data by time periods')
  test('calculates moving averages correctly')
  test('handles missing data points')
  test('formats data for different chart types')
  test('applies consistent scaling and normalization')
})

describe('Chart Export Functions', () => {
  test('exports charts as PNG with correct dimensions')
  test('generates PDF reports with multiple charts')
  test('includes data tables in exports')
  test('maintains chart quality in exports')
})
```

### Test Data Management

#### Mock Data Generators
```typescript
// test-utils/mock-generators.ts

export const generateMockJournalEntry = (overrides = {}) => ({
  _id: `entry_${Date.now()}`,
  userId: 'test_user_123',
  relationshipId: 'rel_test_001',
  content: 'Test journal entry with meaningful content for testing purposes',
  mood: 'happy',
  tags: ['test', 'mock'],
  isPrivate: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})

export const generateMockRelationship = (overrides = {}) => ({
  _id: `rel_${Date.now()}`,
  userId: 'test_user_123',
  name: 'Test Person',
  type: 'friend' as const,
  isActive: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})
```

### Success Criteria
- ✅ Unit test coverage: 90%+ for critical components
- ✅ All edge cases covered with appropriate error handling
- ✅ TypeScript type safety maintained across all tests
- ✅ Test execution time: <2 minutes for full unit test suite
- ✅ Zero flaky tests in CI environment

---

## Integration Testing Plan

### Scope & Objectives
- Test component interactions with Convex backend
- Validate real-time data synchronization
- Test authentication flows and state management
- Ensure proper error handling across system boundaries

### Test Categories

#### 1. Convex Integration Testing

##### Real-time Data Synchronization
```typescript
describe('Convex Real-time Integration', () => {
  beforeEach(async () => {
    // Set up test Convex environment
    await setupTestConvexDeployment()
  })

  test('journal entry creation propagates to all subscribed components', async () => {
    const { result: listResult } = renderHook(() => useQuery(api.journalEntries.list))
    const { result: createResult } = renderHook(() => useMutation(api.journalEntries.create))
    
    // Create new entry
    await act(async () => {
      await createResult.current({
        content: 'Integration test entry',
        relationshipId: 'test_rel_id',
        mood: 'excited'
      })
    })
    
    // Verify real-time update
    await waitFor(() => {
      expect(listResult.current).toContainEqual(
        expect.objectContaining({ content: 'Integration test entry' })
      )
    })
  })

  test('handles Convex connection failures gracefully', async () => {
    // Simulate connection failure
    await simulateConvexDisconnection()
    
    const { result } = renderHook(() => useQuery(api.journalEntries.list))
    
    expect(result.current).toBeUndefined()
    // Verify retry mechanism works
    await waitFor(() => {
      expect(result.current).toBeDefined()
    }, { timeout: 10000 })
  })

  test('maintains data consistency across multiple mutations', async () => {
    const { result: createMutation } = renderHook(() => useMutation(api.journalEntries.create))
    const { result: updateMutation } = renderHook(() => useMutation(api.journalEntries.update))
    
    // Create entry
    const entryId = await act(async () => {
      return await createMutation.current({ content: 'Original content' })
    })
    
    // Update entry
    await act(async () => {
      await updateMutation.current({ id: entryId, content: 'Updated content' })
    })
    
    // Verify consistency
    const { result: queryResult } = renderHook(() => 
      useQuery(api.journalEntries.get, { id: entryId })
    )
    
    expect(queryResult.current?.content).toBe('Updated content')
  })
})
```

##### Dashboard Data Integration
```typescript
describe('Dashboard Data Integration', () => {
  test('aggregates health scores from multiple relationships', async () => {
    // Seed test data
    await seedMultipleRelationshipsWithEntries()
    
    const { result } = renderHook(() => useQuery(api.insights.getDashboardData))
    
    await waitFor(() => {
      const dashboardData = result.current
      expect(dashboardData.healthScores).toHaveLength(3)
      expect(dashboardData.trendData.dataPoints).toHaveLength.greaterThan(0)
      expect(dashboardData.recentActivity).toHaveLength.greaterThan(0)
    })
  })

  test('updates charts when new journal entries affect health scores', async () => {
    const { result: chartData } = renderHook(() => 
      useQuery(api.insights.getTrendData, { timeRange: 'month' })
    )
    
    const initialDataPoints = chartData.current?.dataPoints.length || 0
    
    // Add entry that should affect health score
    const { result: createEntry } = renderHook(() => useMutation(api.journalEntries.create))
    await act(async () => {
      await createEntry.current({
        content: 'Extremely positive interaction with deep emotional connection',
        mood: 'joyful',
        relationshipId: 'test_rel_id'
      })
    })
    
    // Verify chart data updates
    await waitFor(() => {
      expect(chartData.current?.dataPoints.length).toBeGreaterThan(initialDataPoints)
    })
  })
})
```

#### 2. Authentication Integration Testing

##### Clerk + Convex User Sync
```typescript
describe('Authentication Integration', () => {
  test('creates Convex user when Clerk user signs up', async () => {
    // Mock Clerk webhook
    const webhookPayload = {
      type: 'user.created',
      data: {
        id: 'clerk_user_123',
        email_addresses: [{ email_address: 'test@example.com' }],
        first_name: 'Test',
        last_name: 'User'
      }
    }
    
    // Send webhook
    const response = await fetch('/api/webhooks/clerk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    })
    
    expect(response.status).toBe(200)
    
    // Verify user created in Convex
    const convexUser = await queryConvexUser('clerk_user_123')
    expect(convexUser).toMatchObject({
      clerkId: 'clerk_user_123',
      email: 'test@example.com',
      name: 'Test User'
    })
  })

  test('handles authentication state changes correctly', async () => {
    const { result: authState } = renderHook(() => useAuth())
    
    // Initially unauthenticated
    expect(authState.current.userId).toBeNull()
    
    // Mock sign in
    await act(async () => {
      mockClerkSignIn('clerk_user_123')
    })
    
    await waitFor(() => {
      expect(authState.current.userId).toBe('clerk_user_123')
    })
    
    // Mock sign out
    await act(async () => {
      mockClerkSignOut()
    })
    
    await waitFor(() => {
      expect(authState.current.userId).toBeNull()
    })
  })
})
```

#### 3. Search Integration Testing

##### Search Performance and Accuracy
```typescript
describe('Search Integration', () => {
  test('searches across journal entries with real-time updates', async () => {
    // Seed searchable content
    await seedJournalEntriesForSearch()
    
    const { result: searchResults } = renderHook(() => 
      useQuery(api.search.journalEntries, { query: 'communication' })
    )
    
    await waitFor(() => {
      expect(searchResults.current).toHaveLength.greaterThan(0)
      expect(searchResults.current[0].content).toContain('communication')
    })
    
    // Add new entry that should appear in search
    const { result: createEntry } = renderHook(() => useMutation(api.journalEntries.create))
    await act(async () => {
      await createEntry.current({
        content: 'New entry about communication patterns',
        relationshipId: 'test_rel_id'
      })
    })
    
    // Verify search results update
    await waitFor(() => {
      expect(searchResults.current).toHaveLength.greaterThan(0)
      expect(searchResults.current.some(entry => 
        entry.content.includes('New entry about communication')
      )).toBe(true)
    })
  })
})
```

### Success Criteria
- ✅ All Convex subscriptions maintain real-time synchronization
- ✅ Authentication flows complete without data loss
- ✅ Search functionality returns accurate, real-time results
- ✅ Error scenarios handled gracefully with user feedback
- ✅ Integration test execution time: <5 minutes

---

## End-to-End Testing Plan

### Scope & Objectives
- Test complete user journeys from start to finish
- Validate cross-browser and cross-device compatibility
- Ensure real authentication and payment flows work
- Test performance under realistic usage conditions

### Critical User Journeys

#### Journey 1: New User Onboarding
```typescript
// tests/e2e/user-journeys/onboarding.test.ts

test('complete new user onboarding flow', async ({ page }) => {
  // Landing page
  await page.goto('/')
  await expect(page.getByText('Welcome to Resonant')).toBeVisible()
  
  // Sign up flow
  await page.getByRole('link', { name: 'Get Started' }).click()
  await page.getByRole('textbox', { name: 'Email' }).fill('newuser@example.com')
  await page.getByRole('textbox', { name: 'Password' }).fill('SecurePassword123!')
  await page.getByRole('button', { name: 'Sign Up' }).click()
  
  // Email verification (in test environment)
  await verifyEmailInTestEnvironment('newuser@example.com')
  
  // Initial relationship setup
  await expect(page.getByText('Add Your First Relationship')).toBeVisible()
  await page.getByRole('textbox', { name: 'Name' }).fill('Sarah Johnson')
  await page.getByRole('combobox', { name: 'Relationship Type' }).selectOption('friend')
  await page.getByRole('button', { name: 'Add Relationship' }).click()
  
  // First journal entry
  await expect(page.getByText('Write Your First Journal Entry')).toBeVisible()
  await page.getByRole('textbox', { name: "What's on your mind?" }).fill(
    'Just started using Resonant to track my relationship with Sarah. ' +
    'Excited to see how this helps us stay connected and communicate better.'
  )
  await page.getByTestId('mood-selector').getByText('😊').click()
  await page.getByRole('button', { name: 'Save Entry' }).click()
  
  // Dashboard redirect
  await expect(page.getByText('Your Relationship Dashboard')).toBeVisible()
  await expect(page.getByText('Sarah Johnson')).toBeVisible()
  await expect(page.getByText('Health Score')).toBeVisible()
})
```

#### Journey 2: Daily Journal Entry Creation
```typescript
test('create and edit journal entry with all features', async ({ page }) => {
  await signInAs('activeuser@example.com', page)
  
  // Navigate to journal
  await page.getByRole('link', { name: 'Journal' }).click()
  await page.getByRole('button', { name: 'New Entry' }).click()
  
  // Select relationship
  await page.getByTestId('relationship-picker').click()
  await page.getByText('Sarah Johnson').click()
  
  // Write content
  const content = 'Had a wonderful dinner conversation with Sarah tonight. ' +
    'We talked about our upcoming vacation plans and she shared some ' +
    'concerns about work that I hadn\'t heard before. ' +
    'Really appreciate how open she\'s been lately.'
  await page.getByRole('textbox', { name: "What's on your mind?" }).fill(content)
  
  // Select mood
  await page.getByTestId('mood-selector').getByText('🥰').click()
  
  // Add tags
  await page.getByRole('textbox', { name: 'Tags' }).fill('communication, vacation-planning, work-stress')
  
  // Privacy setting
  await page.getByRole('checkbox', { name: 'Keep this entry private' }).uncheck()
  
  // Save entry
  await page.getByRole('button', { name: 'Save Entry' }).click()
  
  // Verify save success
  await expect(page.getByText('Entry saved successfully')).toBeVisible()
  await expect(page.getByText(content.substring(0, 50))).toBeVisible()
  
  // Edit the entry
  await page.getByText(content.substring(0, 50)).click()
  await page.getByRole('button', { name: 'Edit' }).click()
  
  // Add additional content
  await page.getByRole('textbox', { name: "What's on your mind?" }).fill(
    content + ' Looking forward to supporting her through this busy period.'
  )
  
  // Update mood
  await page.getByTestId('mood-selector').getByText('😌').click()
  
  // Save changes
  await page.getByRole('button', { name: 'Update Entry' }).click()
  
  // Verify update
  await expect(page.getByText('Entry updated successfully')).toBeVisible()
})
```

#### Journey 3: Dashboard Analytics Exploration
```typescript
test('explore dashboard analytics and insights', async ({ page }) => {
  await signInAs('poweruser@example.com', page)
  
  // Dashboard overview
  await page.goto('/dashboard')
  await expect(page.getByText('Your Relationship Dashboard')).toBeVisible()
  
  // Health score cards
  const healthScoreCard = page.getByTestId('health-score-card').first()
  await expect(healthScoreCard.getByText(/Health Score/)).toBeVisible()
  await expect(healthScoreCard.getByText(/\d+/)).toBeVisible()
  
  // Click for detailed breakdown
  await healthScoreCard.click()
  await expect(page.getByText('Communication: ')).toBeVisible()
  await expect(page.getByText('Trust & Intimacy: ')).toBeVisible()
  await expect(page.getByText('Emotional Support: ')).toBeVisible()
  
  // Sentiment trend chart
  const trendChart = page.getByTestId('sentiment-trend-chart')
  await expect(trendChart).toBeVisible()
  
  // Change time range
  await page.getByRole('combobox', { name: 'Time Range' }).selectOption('quarter')
  await expect(trendChart.getByText('Last 3 Months')).toBeVisible()
  
  // Export chart
  await page.getByRole('button', { name: 'Export Chart' }).click()
  await page.getByText('Export as PNG').click()
  
  // Verify download initiated
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toContain('sentiment-trend')
  
  // Relationship comparison
  await page.getByRole('button', { name: 'Compare Relationships' }).click()
  await page.getByTestId('relationship-selector').getByText('Sarah Johnson').click()
  await page.getByTestId('relationship-selector').getByText('Mike Chen').click()
  await page.getByRole('button', { name: 'Generate Comparison' }).click()
  
  await expect(page.getByTestId('comparison-chart')).toBeVisible()
  await expect(page.getByText('Sarah Johnson vs Mike Chen')).toBeVisible()
})
```

#### Journey 4: Search and Filter Functionality
```typescript
test('search and filter journal entries', async ({ page }) => {
  await signInAs('activeuser@example.com', page)
  
  // Navigate to search
  await page.getByRole('link', { name: 'Search' }).click()
  
  // Basic text search
  await page.getByRole('textbox', { name: 'Search entries...' }).fill('communication')
  await page.getByRole('button', { name: 'Search' }).click()
  
  // Verify results
  const searchResults = page.getByTestId('search-results')
  await expect(searchResults.getByText(/\d+ results/)).toBeVisible()
  await expect(searchResults.getByText('communication', { selector: 'mark' })).toBeVisible()
  
  // Apply filters
  await page.getByRole('button', { name: 'Filters' }).click()
  
  // Filter by relationship
  await page.getByTestId('relationship-filter').getByText('Sarah Johnson').click()
  
  // Filter by mood
  await page.getByTestId('mood-filter').getByText('😊 Happy').click()
  
  // Filter by date range
  await page.getByRole('textbox', { name: 'From Date' }).fill('2024-01-01')
  await page.getByRole('textbox', { name: 'To Date' }).fill('2024-12-31')
  
  // Apply filters
  await page.getByRole('button', { name: 'Apply Filters' }).click()
  
  // Verify filtered results
  await expect(searchResults.getByText('Sarah Johnson')).toBeVisible()
  await expect(searchResults.getByText('😊')).toBeVisible()
  
  // Clear filters
  await page.getByRole('button', { name: 'Clear All Filters' }).click()
  
  // Verify filters cleared
  await expect(page.getByTestId('active-filters')).toHaveCount(0)
})
```

### Cross-Browser Testing

#### Browser-Specific Test Scenarios
```typescript
// tests/e2e/cross-browser/compatibility.test.ts

test.describe('Cross-browser compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test.describe(`${browserName} specific tests`, () => {
      test('dashboard loads and functions correctly', async ({ page }) => {
        await signInAs('testuser@example.com', page)
        await page.goto('/dashboard')
        
        // Verify critical elements render
        await expect(page.getByText('Your Relationship Dashboard')).toBeVisible()
        await expect(page.getByTestId('health-score-card')).toBeVisible()
        await expect(page.getByTestId('trend-chart')).toBeVisible()
        
        // Test chart interactions
        const chart = page.getByTestId('sentiment-trend-chart')
        await chart.hover()
        await expect(page.getByTestId('chart-tooltip')).toBeVisible()
      })
      
      test('form submissions work correctly', async ({ page }) => {
        await signInAs('testuser@example.com', page)
        await page.goto('/journal/new')
        
        // Fill and submit form
        await fillJournalEntryForm(page)
        await page.getByRole('button', { name: 'Save Entry' }).click()
        
        // Verify success across browsers
        await expect(page.getByText('Entry saved successfully')).toBeVisible()
      })
    })
  })
})
```

### Mobile Responsiveness Testing

#### Mobile-Specific User Journeys
```typescript
test.describe('Mobile responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE
  
  test('mobile journal entry creation', async ({ page }) => {
    await signInAs('mobileuser@example.com', page)
    
    // Navigation menu (hamburger)
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('link', { name: 'Journal' }).click()
    
    // Mobile-optimized entry form
    await page.getByRole('button', { name: 'New Entry' }).click()
    
    // Touch-friendly interactions
    await page.getByTestId('relationship-picker-mobile').tap()
    await page.getByText('Sarah Johnson').tap()
    
    // Mobile keyboard input
    await page.getByRole('textbox', { name: "What's on your mind?" }).tap()
    await page.keyboard.type('Testing mobile journal entry creation')
    
    // Touch-friendly mood selector
    await page.getByTestId('mood-selector-mobile').swipe({ direction: 'left' })
    await page.getByTestId('mood-happy').tap()
    
    // Save entry
    await page.getByRole('button', { name: 'Save Entry' }).tap()
    
    // Verify mobile success feedback
    await expect(page.getByTestId('mobile-success-toast')).toBeVisible()
  })
})
```

### Performance Testing Integration

#### Load Time and Performance Metrics
```typescript
test('dashboard performance benchmarks', async ({ page }) => {
  await signInAs('poweruser@example.com', page)
  
  // Measure initial load time
  const startTime = Date.now()
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
  const loadTime = Date.now() - startTime
  
  expect(loadTime).toBeLessThan(3000) // 3 second budget
  
  // Lighthouse audit
  const lighthouseResult = await runLighthouseAudit(page)
  expect(lighthouseResult.performance).toBeGreaterThan(90)
  expect(lighthouseResult.accessibility).toBeGreaterThan(95)
  expect(lighthouseResult.bestPractices).toBeGreaterThan(90)
  
  // Core Web Vitals
  const vitals = await getCoreWebVitals(page)
  expect(vitals.LCP).toBeLessThan(2500) // Largest Contentful Paint
  expect(vitals.FID).toBeLessThan(100)  // First Input Delay
  expect(vitals.CLS).toBeLessThan(0.1)  // Cumulative Layout Shift
})
```

### Success Criteria
- ✅ All critical user journeys complete successfully
- ✅ Cross-browser compatibility (Chrome, Firefox, Safari)
- ✅ Mobile responsiveness (phone and tablet)
- ✅ Performance benchmarks met (load time <3s, LCP <2.5s)
- ✅ Real authentication flows work end-to-end
- ✅ E2E test execution time: <15 minutes for full suite

---

## Performance Testing Plan

### Scope & Objectives
- Validate application performance under realistic load
- Test real-time features with multiple concurrent users
- Identify performance bottlenecks in AI processing
- Ensure database query optimization

### Load Testing Scenarios

#### Scenario 1: Concurrent Journal Entry Creation
```typescript
// tests/performance/load-testing.test.ts

test('concurrent journal entry creation load test', async () => {
  const concurrentUsers = 50
  const entriesPerUser = 5
  
  const userPromises = Array.from({ length: concurrentUsers }, async (_, index) => {
    const userContext = await createUserContext(`loadtest_user_${index}`)
    
    for (let i = 0; i < entriesPerUser; i++) {
      const startTime = performance.now()
      
      await userContext.createJournalEntry({
        content: `Load test entry ${i} from user ${index}`,
        relationshipId: `rel_${index}_${i % 3}`,
        mood: ['happy', 'sad', 'excited', 'calm'][i % 4]
      })
      
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      // Log performance metrics
      console.log(`User ${index}, Entry ${i}: ${responseTime}ms`)
      expect(responseTime).toBeLessThan(1000) // 1 second SLA
    }
  })
  
  const overallStartTime = performance.now()
  await Promise.all(userPromises)
  const overallEndTime = performance.now()
  
  const totalTime = overallEndTime - overallStartTime
  const totalOperations = concurrentUsers * entriesPerUser
  const avgOperationsPerSecond = totalOperations / (totalTime / 1000)
  
  console.log(`Total time: ${totalTime}ms`)
  console.log(`Operations per second: ${avgOperationsPerSecond}`)
  
  expect(avgOperationsPerSecond).toBeGreaterThan(20) // Performance target
})
```

#### Scenario 2: Dashboard Real-time Updates
```typescript
test('dashboard real-time update performance', async () => {
  const dashboardUsers = 20
  const updateFrequency = 5000 // 5 seconds
  const testDuration = 60000 // 1 minute
  
  // Create dashboard subscribers
  const dashboardContexts = await Promise.all(
    Array.from({ length: dashboardUsers }, (_, index) =>
      createDashboardContext(`dashboard_user_${index}`)
    )
  )
  
  // Start monitoring dashboard update times
  const updateTimes = []
  dashboardContexts.forEach((context, index) => {
    context.onHealthScoreUpdate((updateTime) => {
      updateTimes.push({
        user: index,
        latency: updateTime,
        timestamp: Date.now()
      })
    })
  })
  
  // Generate updates from separate users
  const updateInterval = setInterval(async () => {
    const updateUser = await createUserContext('update_generator')
    await updateUser.createJournalEntry({
      content: 'Performance test entry triggering dashboard updates',
      mood: 'happy'
    })
  }, updateFrequency)
  
  // Run test for specified duration
  await new Promise(resolve => setTimeout(resolve, testDuration))
  clearInterval(updateInterval)
  
  // Analyze performance metrics
  const avgLatency = updateTimes.reduce((sum, update) => sum + update.latency, 0) / updateTimes.length
  const maxLatency = Math.max(...updateTimes.map(update => update.latency))
  
  expect(avgLatency).toBeLessThan(500) // 500ms average latency
  expect(maxLatency).toBeLessThan(2000) // 2s maximum latency
  expect(updateTimes.length).toBeGreaterThan(dashboardUsers * 5) // Minimum update frequency
})
```

#### Scenario 3: AI Analysis Processing Load
```typescript
test('AI analysis processing under load', async () => {
  const analysisRequests = 100
  const batchSize = 10
  
  // Generate test journal entries for analysis
  const testEntries = Array.from({ length: analysisRequests }, (_, index) => ({
    id: `analysis_entry_${index}`,
    content: generateRealisticJournalContent(),
    mood: ['happy', 'sad', 'angry', 'excited', 'calm'][index % 5]
  }))
  
  const processingTimes = []
  const errors = []
  
  // Process in batches to simulate realistic load
  for (let i = 0; i < testEntries.length; i += batchSize) {
    const batch = testEntries.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (entry) => {
      const startTime = performance.now()
      
      try {
        const analysis = await analyzeJournalEntry(entry.content, entry.mood)
        const endTime = performance.now()
        
        processingTimes.push(endTime - startTime)
        
        // Validate analysis quality
        expect(analysis.sentimentScore).toBeGreaterThanOrEqual(-1)
        expect(analysis.sentimentScore).toBeLessThanOrEqual(1)
        expect(analysis.confidenceLevel).toBeGreaterThanOrEqual(0)
        expect(analysis.confidenceLevel).toBeLessThanOrEqual(1)
        expect(analysis.emotionalKeywords).toBeInstanceOf(Array)
        
      } catch (error) {
        errors.push({ entry: entry.id, error: error.message })
      }
    })
    
    await Promise.all(batchPromises)
    
    // Brief pause between batches to simulate realistic usage
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  // Performance analysis
  const avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
  const maxProcessingTime = Math.max(...processingTimes)
  const errorRate = errors.length / analysisRequests
  
  console.log(`Average processing time: ${avgProcessingTime}ms`)
  console.log(`Maximum processing time: ${maxProcessingTime}ms`)
  console.log(`Error rate: ${errorRate * 100}%`)
  
  expect(avgProcessingTime).toBeLessThan(3000) // 3 second average
  expect(maxProcessingTime).toBeLessThan(10000) // 10 second maximum
  expect(errorRate).toBeLessThan(0.05) // 5% error rate threshold
})
```

### Database Performance Testing

#### Query Optimization Testing
```typescript
test('database query performance optimization', async () => {
  // Seed large dataset
  await seedLargeDataset({
    users: 1000,
    relationships: 5000,
    journalEntries: 50000,
    healthScores: 10000
  })
  
  const queryTests = [
    {
      name: 'user journal entries with pagination',
      query: () => queryJournalEntries({ userId: 'test_user', limit: 20 }),
      expectedMaxTime: 100
    },
    {
      name: 'relationship health scores',
      query: () => queryHealthScores({ userId: 'test_user' }),
      expectedMaxTime: 200
    },
    {
      name: 'sentiment trend aggregation',
      query: () => queryTrendData({ userId: 'test_user', timeRange: 'month' }),
      expectedMaxTime: 500
    },
    {
      name: 'search across journal entries',
      query: () => searchJournalEntries({ query: 'communication', userId: 'test_user' }),
      expectedMaxTime: 300
    }
  ]
  
  for (const test of queryTests) {
    const startTime = performance.now()
    const result = await test.query()
    const endTime = performance.now()
    const queryTime = endTime - startTime
    
    console.log(`${test.name}: ${queryTime}ms`)
    expect(queryTime).toBeLessThan(test.expectedMaxTime)
    expect(result).toBeDefined()
  }
})
```

### Memory and Resource Usage Testing

#### Memory Leak Detection
```typescript
test('memory usage monitoring', async () => {
  const initialMemory = process.memoryUsage()
  
  // Simulate intensive dashboard usage
  for (let i = 0; i < 100; i++) {
    const dashboardContext = await createDashboardContext(`memory_test_${i}`)
    
    // Load dashboard data
    await dashboardContext.loadHealthScores()
    await dashboardContext.loadTrendData()
    await dashboardContext.loadRecentActivity()
    
    // Simulate user interactions
    await dashboardContext.filterByRelationship('test_rel')
    await dashboardContext.changeTimeRange('quarter')
    
    // Clean up context
    await dashboardContext.cleanup()
    
    // Monitor memory growth
    if (i % 10 === 0) {
      const currentMemory = process.memoryUsage()
      const memoryGrowth = currentMemory.heapUsed - initialMemory.heapUsed
      console.log(`Iteration ${i}: Memory growth ${memoryGrowth / 1024 / 1024} MB`)
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
    }
  }
  
  // Final memory check
  const finalMemory = process.memoryUsage()
  const totalGrowth = finalMemory.heapUsed - initialMemory.heapUsed
  
  expect(totalGrowth).toBeLessThan(100 * 1024 * 1024) // 100MB growth limit
})
```

### Success Criteria
- ✅ Handle 50+ concurrent users without performance degradation
- ✅ Journal entry creation: <1 second response time
- ✅ Dashboard updates: <500ms average latency
- ✅ AI analysis: <3 second average processing time
- ✅ Database queries: Optimized for large datasets
- ✅ Memory usage: Stable without significant leaks

---

## Security Testing Plan

### Scope & Objectives
- Validate authentication and authorization mechanisms
- Test data privacy and encryption
- Ensure secure handling of sensitive information
- Validate API security and rate limiting

### Authentication Security Testing

#### Clerk Authentication Flow Security
```typescript
// tests/security/authentication.test.ts

test('authentication flow security validation', async ({ page }) => {
  // Test unauthorized access prevention
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/sign-in/)
  
  // Test session management
  await signInAs('securitytest@example.com', page)
  await page.goto('/dashboard')
  await expect(page.getByText('Your Relationship Dashboard')).toBeVisible()
  
  // Test session expiration
  await expireSession(page)
  await page.reload()
  await expect(page).toHaveURL(/sign-in/)
  
  // Test CSRF protection
  const response = await page.request.post('/api/journal/create', {
    data: { content: 'Unauthorized entry' }
    // No CSRF token - should fail
  })
  expect(response.status()).toBe(403)
})

test('JWT token security validation', async () => {
  // Test token expiration
  const expiredToken = generateExpiredJWT()
  const response = await fetch('/api/protected-endpoint', {
    headers: { Authorization: `Bearer ${expiredToken}` }
  })
  expect(response.status).toBe(401)
  
  // Test token tampering
  const tamperedToken = generateTamperedJWT()
  const tamperedResponse = await fetch('/api/protected-endpoint', {
    headers: { Authorization: `Bearer ${tamperedToken}` }
  })
  expect(tamperedResponse.status).toBe(401)
  
  // Test valid token
  const validToken = await generateValidJWT('test_user')
  const validResponse = await fetch('/api/protected-endpoint', {
    headers: { Authorization: `Bearer ${validToken}` }
  })
  expect(validResponse.status).toBe(200)
})
```

#### Authorization Testing
```typescript
test('user data access authorization', async () => {
  const user1 = await createTestUser('user1@example.com')
  const user2 = await createTestUser('user2@example.com')
  
  // User 1 creates journal entry
  const entry = await user1.createJournalEntry({
    content: 'Private entry for user 1',
    isPrivate: true
  })
  
  // User 2 should not be able to access user 1's entry
  await expect(user2.getJournalEntry(entry.id)).rejects.toThrow('Unauthorized')
  
  // User 2 should not be able to access user 1's relationships
  await expect(user2.getRelationships()).resolves.toEqual([])
  
  // User 2 should not be able to access user 1's health scores
  await expect(user2.getHealthScores()).resolves.toEqual([])
})

test('admin vs user permissions', async () => {
  const regularUser = await createTestUser('user@example.com')
  const adminUser = await createTestUser('admin@example.com', { role: 'admin' })
  
  // Regular user cannot access admin endpoints
  await expect(regularUser.getAllUsers()).rejects.toThrow('Forbidden')
  await expect(regularUser.getSystemMetrics()).rejects.toThrow('Forbidden')
  
  // Admin user can access admin endpoints
  await expect(adminUser.getAllUsers()).resolves.toBeDefined()
  await expect(adminUser.getSystemMetrics()).resolves.toBeDefined()
  
  // Admin cannot access other users' private data
  await expect(adminUser.getPrivateJournalEntries('user_123')).rejects.toThrow('Forbidden')
})
```

### Data Privacy Testing

#### Personal Data Protection
```typescript
test('personal data encryption and privacy', async () => {
  const user = await createTestUser('privacy@example.com')
  
  // Create sensitive journal entry
  const sensitiveContent = 'Very personal information about my relationship struggles'
  const entry = await user.createJournalEntry({
    content: sensitiveContent,
    isPrivate: true
  })
  
  // Verify data is encrypted in database
  const rawDatabaseEntry = await getRawDatabaseRecord('journalEntries', entry.id)
  expect(rawDatabaseEntry.content).not.toBe(sensitiveContent)
  expect(rawDatabaseEntry.content).toMatch(/^encrypted:/) // Assuming encryption prefix
  
  // Verify decryption works for authorized user
  const decryptedEntry = await user.getJournalEntry(entry.id)
  expect(decryptedEntry.content).toBe(sensitiveContent)
  
  // Verify AI analysis respects privacy settings
  if (entry.isPrivate && !entry.allowAIAnalysis) {
    const analysis = await getAIAnalysis(entry.id)
    expect(analysis).toBeNull()
  }
})

test('data anonymization for AI processing', async () => {
  const user = await createTestUser('aitest@example.com')
  
  // Create entry with personal identifiers
  const entryWithPII = await user.createJournalEntry({
    content: 'Met with Dr. Johnson at 123 Main Street to discuss my relationship with Sarah Smith',
    allowAIAnalysis: true
  })
  
  // Verify AI processing receives anonymized content
  const aiInput = await getAIProcessingInput(entryWithPII.id)
  expect(aiInput.content).not.toContain('Dr. Johnson')
  expect(aiInput.content).not.toContain('123 Main Street')
  expect(aiInput.content).not.toContain('Sarah Smith')
  expect(aiInput.content).toContain('[PERSON]') // Anonymization placeholder
  expect(aiInput.content).toContain('[LOCATION]') // Anonymization placeholder
})
```

#### GDPR Compliance Testing
```typescript
test('GDPR data rights compliance', async () => {
  const user = await createTestUser('gdpr@example.com')
  
  // Create test data
  await user.createMultipleJournalEntries(10)
  await user.createRelationships(3)
  
  // Test data export (Right to Data Portability)
  const exportData = await user.requestDataExport()
  expect(exportData).toHaveProperty('journalEntries')
  expect(exportData).toHaveProperty('relationships')
  expect(exportData).toHaveProperty('healthScores')
  expect(exportData.journalEntries).toHaveLength(10)
  
  // Test data deletion (Right to Erasure)
  await user.requestDataDeletion()
  
  // Verify data is properly deleted
  await expect(user.getJournalEntries()).resolves.toEqual([])
  await expect(user.getRelationships()).resolves.toEqual([])
  await expect(user.getHealthScores()).resolves.toEqual([])
  
  // Verify user account is deactivated
  await expect(user.getProfile()).rejects.toThrow('User not found')
})
```

### API Security Testing

#### Rate Limiting and DDoS Protection
```typescript
test('API rate limiting protection', async () => {
  const user = await createTestUser('ratelimit@example.com')
  const requests = []
  
  // Attempt to exceed rate limit
  for (let i = 0; i < 100; i++) {
    requests.push(
      user.createJournalEntry({
        content: `Rate limit test entry ${i}`
      }).catch(error => error)
    )
  }
  
  const results = await Promise.all(requests)
  const errors = results.filter(result => result instanceof Error)
  const successes = results.filter(result => !(result instanceof Error))
  
  // Verify rate limiting kicks in
  expect(errors.length).toBeGreaterThan(0)
  expect(errors.some(error => error.message.includes('Rate limit exceeded'))).toBe(true)
  expect(successes.length).toBeLessThan(100)
})

test('AI API rate limiting and cost protection', async () => {
  const user = await createTestUser('aicost@example.com')
  const analysisRequests = []
  
  // Attempt multiple AI analysis requests
  for (let i = 0; i < 50; i++) {
    analysisRequests.push(
      user.requestAIAnalysis({
        content: `Analysis request ${i} with substantial content for processing`
      }).catch(error => error)
    )
  }
  
  const results = await Promise.all(analysisRequests)
  const errors = results.filter(result => result instanceof Error)
  
  // Verify cost protection measures
  expect(errors.some(error => 
    error.message.includes('Daily AI analysis limit exceeded')
  )).toBe(true)
})
```

#### Input Validation and Sanitization
```typescript
test('input validation and XSS protection', async () => {
  const user = await createTestUser('xsstest@example.com')
  
  const maliciousInputs = [
    '<script>alert("XSS")</script>',
    '"><script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '${alert("XSS")}',
    '<img src=x onerror=alert("XSS")>',
  ]
  
  for (const maliciousInput of maliciousInputs) {
    // Test journal content sanitization
    const entry = await user.createJournalEntry({
      content: `Normal content ${maliciousInput} more content`
    })
    
    const savedEntry = await user.getJournalEntry(entry.id)
    expect(savedEntry.content).not.toContain('<script>')
    expect(savedEntry.content).not.toContain('javascript:')
    expect(savedEntry.content).not.toContain('onerror=')
    
    // Test relationship name sanitization
    await expect(user.createRelationship({
      name: maliciousInput,
      type: 'friend'
    })).rejects.toThrow('Invalid name format')
  }
})

test('SQL injection protection', async () => {
  const user = await createTestUser('sqltest@example.com')
  
  const sqlInjectionAttempts = [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "'; UPDATE users SET role='admin' WHERE id='1'; --",
    "' UNION SELECT * FROM sensitive_data --"
  ]
  
  for (const injection of sqlInjectionAttempts) {
    // Test search functionality
    const searchResults = await user.searchJournalEntries(injection)
    expect(searchResults).toEqual([]) // Should return empty, not error
    
    // Test filter parameters
    await expect(user.getJournalEntries({
      relationshipId: injection
    })).resolves.toEqual([])
  }
  
  // Verify database integrity
  const userCount = await getDatabaseUserCount()
  expect(userCount).toBeGreaterThan(0) // Table should still exist
})
```

### Security Headers and HTTPS Testing

#### Security Headers Validation
```typescript
test('security headers validation', async ({ page }) => {
  const response = await page.goto('/')
  
  const headers = response.headers()
  
  // Content Security Policy
  expect(headers['content-security-policy']).toBeDefined()
  expect(headers['content-security-policy']).toContain("default-src 'self'")
  
  // HTTPS Security
  expect(headers['strict-transport-security']).toBeDefined()
  expect(headers['strict-transport-security']).toContain('max-age=')
  
  // XSS Protection
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['x-frame-options']).toBe('DENY')
  
  // Referrer Policy
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
})
```

### Success Criteria
- ✅ All authentication flows secure and properly validated
- ✅ User data properly isolated and encrypted
- ✅ API rate limiting prevents abuse
- ✅ Input validation prevents injection attacks
- ✅ GDPR compliance for data rights
- ✅ Security headers properly configured
- ✅ No sensitive data exposed in logs or error messages

---

## Accessibility Testing Plan

### Scope & Objectives
- Ensure WCAG 2.1 AA compliance across all components
- Test keyboard navigation and screen reader compatibility
- Validate color contrast and visual accessibility
- Test with assistive technologies

### WCAG 2.1 Compliance Testing

#### Automated Accessibility Testing
```typescript
// tests/accessibility/automated-a11y.test.ts
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

describe('Automated Accessibility Testing', () => {
  test('dashboard page accessibility', async () => {
    render(<Dashboard />)
    const results = await axe(document.body)
    expect(results).toHaveNoViolations()
  })

  test('journal entry form accessibility', async () => {
    render(<JournalEntryEditor />)
    const results = await axe(document.body, {
      rules: {
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-management': { enabled: true }
      }
    })
    expect(results).toHaveNoViolations()
  })

  test('charts and data visualization accessibility', async () => {
    render(<SentimentTrendChart data={mockChartData} />)
    const results = await axe(document.body, {
      rules: {
        'svg-img-alt': { enabled: true },
        'aria-labels': { enabled: true }
      }
    })
    expect(results).toHaveNoViolations()
  })
})
```

#### Keyboard Navigation Testing
```typescript
describe('Keyboard Navigation', () => {
  test('journal entry form keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<JournalEntryEditor />)
    
    // Tab through form elements
    await user.tab()
    expect(screen.getByLabelText("What's on your mind?")).toHaveFocus()
    
    await user.tab()
    expect(screen.getByLabelText('Select relationship')).toHaveFocus()
    
    await user.tab()
    expect(screen.getByLabelText('Mood')).toHaveFocus()
    
    // Test mood selector keyboard interaction
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('option', { name: 'Happy' })).toHaveAttribute('aria-selected', 'true')
    
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('option', { name: 'Excited' })).toHaveAttribute('aria-selected', 'true')
    
    // Test form submission via keyboard
    await user.keyboard('{Enter}')
    expect(screen.getByText('Entry saved successfully')).toBeInTheDocument()
  })

  test('dashboard navigation via keyboard', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)
    
    // Skip to main content
    await user.tab()
    expect(screen.getByText('Skip to main content')).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('main')).toHaveFocus()
    
    // Navigate through health score cards
    await user.tab()
    const firstHealthCard = screen.getAllByRole('button', { name: /health score/i })[0]
    expect(firstHealthCard).toHaveFocus()
    
    // Activate health card with keyboard
    await user.keyboard('{Enter}')
    expect(screen.getByText('Health Score Details')).toBeInTheDocument()
    
    // Close modal with Escape
    await user.keyboard('{Escape}')
    expect(screen.queryByText('Health Score Details')).not.toBeInTheDocument()
  })
})
```

#### Screen Reader Testing
```typescript
describe('Screen Reader Compatibility', () => {
  test('journal entry form screen reader labels', () => {
    render(<JournalEntryEditor />)
    
    // Verify proper labeling
    expect(screen.getByLabelText("What's on your mind? (required)")).toBeInTheDocument()
    expect(screen.getByLabelText('Select relationship (required)')).toBeInTheDocument()
    expect(screen.getByLabelText('Choose your mood')).toBeInTheDocument()
    
    // Verify error announcements
    const contentInput = screen.getByLabelText("What's on your mind? (required)")
    fireEvent.blur(contentInput) // Trigger validation
    
    expect(screen.getByText('Content is required')).toHaveAttribute('role', 'alert')
    expect(contentInput).toHaveAttribute('aria-describedby', expect.stringContaining('error'))
  })

  test('chart data accessible descriptions', () => {
    render(<SentimentTrendChart data={mockTrendData} />)
    
    // Verify chart has accessible description
    const chart = screen.getByRole('img', { name: /sentiment trend chart/i })
    expect(chart).toHaveAttribute('aria-describedby')
    
    const description = screen.getByText(/shows sentiment trends over the last 30 days/i)
    expect(description).toBeInTheDocument()
    
    // Verify data table alternative
    const dataTable = screen.getByRole('table', { name: /sentiment trend data/i })
    expect(dataTable).toBeInTheDocument()
    
    // Verify table headers
    expect(screen.getByRole('columnheader', { name: 'Date' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Sentiment Score' })).toBeInTheDocument()
  })

  test('loading states announced to screen readers', async () => {
    render(<Dashboard />)
    
    // Verify loading announcement
    expect(screen.getByText('Loading dashboard data')).toHaveAttribute('aria-live', 'polite')
    
    // Verify completion announcement
    await waitFor(() => {
      expect(screen.getByText('Dashboard loaded successfully')).toHaveAttribute('aria-live', 'polite')
    })
  })
})
```

### Color Contrast and Visual Accessibility

#### Color Contrast Testing
```typescript
describe('Color Contrast Compliance', () => {
  test('text color contrast meets WCAG AA standards', () => {
    render(<Dashboard />)
    
    const textElements = [
      screen.getByText('Your Relationship Dashboard'),
      screen.getByText('Health Score'),
      screen.getByText('Recent Activity')
    ]
    
    textElements.forEach(element => {
      const styles = window.getComputedStyle(element)
      const contrastRatio = calculateContrastRatio(
        styles.color,
        styles.backgroundColor
      )
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5) // WCAG AA standard
    })
  })

  test('interactive element color contrast', () => {
    render(<JournalEntryEditor />)
    
    const interactiveElements = [
      screen.getByRole('button', { name: 'Save Entry' }),
      screen.getByRole('textbox', { name: "What's on your mind?" }),
      screen.getByRole('combobox', { name: 'Select relationship' })
    ]
    
    interactiveElements.forEach(element => {
      const styles = window.getComputedStyle(element)
      const contrastRatio = calculateContrastRatio(
        styles.color,
        styles.backgroundColor
      )
      expect(contrastRatio).toBeGreaterThanOrEqual(3.0) // Interactive elements minimum
    })
  })

  test('chart color accessibility', () => {
    render(<SentimentTrendChart data={mockChartData} />)
    
    // Verify chart uses colorblind-friendly palette
    const chartColors = getChartColors()
    expect(chartColors).not.toContain('#ff0000') // Pure red
    expect(chartColors).not.toContain('#00ff00') // Pure green
    
    // Verify sufficient contrast between adjacent colors
    for (let i = 0; i < chartColors.length - 1; i++) {
      const contrast = calculateContrastRatio(chartColors[i], chartColors[i + 1])
      expect(contrast).toBeGreaterThanOrEqual(3.0)
    }
  })
})
```

#### Focus Management Testing
```typescript
describe('Focus Management', () => {
  test('modal focus management', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)
    
    // Open health score modal
    await user.click(screen.getByRole('button', { name: /health score/i }))
    
    // Verify focus moves to modal
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    
    // Verify focus trap
    await user.tab()
    await user.tab()
    await user.tab() // Should cycle back to first focusable element
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    
    // Close modal and verify focus return
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: /health score/i })).toHaveFocus()
  })

  test('form error focus management', async () => {
    const user = userEvent.setup()
    render(<JournalEntryEditor />)
    
    // Submit empty form
    await user.click(screen.getByRole('button', { name: 'Save Entry' }))
    
    // Verify focus moves to first error field
    expect(screen.getByLabelText("What's on your mind?")).toHaveFocus()
    
    // Verify error message association
    const errorMessage = screen.getByText('Content is required')
    expect(errorMessage).toHaveAttribute('id')
    expect(screen.getByLabelText("What's on your mind?")).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining(errorMessage.id)
    )
  })
})
```

### Assistive Technology Testing

#### Screen Reader Simulation Testing
```typescript
describe('Assistive Technology Compatibility', () => {
  test('journal entry creation with screen reader simulation', async () => {
    const announcements = []
    
    // Mock screen reader announcements
    const mockScreenReader = {
      announce: jest.fn((text) => announcements.push(text))
    }
    
    render(<JournalEntryEditor screenReader={mockScreenReader} />)
    
    const user = userEvent.setup()
    
    // Fill form with screen reader navigation
    await user.tab() // Focus content field
    expect(announcements).toContain("What's on your mind? required edit text")
    
    await user.type(screen.getByLabelText("What's on your mind?"), 'Test entry content')
    expect(announcements).toContain('Test entry content')
    
    await user.tab() // Move to relationship picker
    expect(announcements).toContain('Select relationship required combo box')
    
    await user.keyboard('{ArrowDown}')
    expect(announcements).toContain('Sarah Johnson selected')
    
    await user.tab() // Move to mood selector
    expect(announcements).toContain('Choose your mood')
    
    await user.keyboard('{ArrowRight}')
    expect(announcements).toContain('Happy mood selected')
    
    // Submit form
    await user.click(screen.getByRole('button', { name: 'Save Entry' }))
    expect(announcements).toContain('Entry saved successfully')
  })

  test('dashboard data exploration with assistive technology', async () => {
    const announcements = []
    const mockScreenReader = {
      announce: jest.fn((text) => announcements.push(text))
    }
    
    render(<Dashboard screenReader={mockScreenReader} />)
    
    const user = userEvent.setup()
    
    // Navigate to health score
    await user.tab()
    await user.tab()
    const healthScoreCard = screen.getByRole('button', { name: /health score.*85/i })
    await user.click(healthScoreCard)
    
    expect(announcements).toContain('Health score 85 out of 100')
    expect(announcements).toContain('Communication score 90')
    expect(announcements).toContain('Trust and intimacy score 80')
    
    // Navigate chart data
    const chartTable = screen.getByRole('table', { name: /health score data/i })
    await user.click(chartTable)
    
    expect(announcements).toContain('Health score data table')
    expect(announcements).toContain('3 rows, 2 columns')
  })
})
```

### Mobile Accessibility Testing

#### Touch and Gesture Accessibility
```typescript
describe('Mobile Accessibility', () => {
  test('mobile journal entry form touch accessibility', async () => {
    // Simulate mobile viewport
    Object.defineProperty(window, 'innerWidth', { value: 375 })
    Object.defineProperty(window, 'innerHeight', { value: 667 })
    
    render(<JournalEntryEditor />)
    
    // Verify touch target sizes (minimum 44px)
    const touchTargets = [
      screen.getByRole('button', { name: 'Save Entry' }),
      screen.getByTestId('mood-selector'),
      screen.getByTestId('relationship-picker')
    ]
    
    touchTargets.forEach(target => {
      const styles = window.getComputedStyle(target)
      const width = parseInt(styles.width)
      const height = parseInt(styles.height)
      
      expect(width).toBeGreaterThanOrEqual(44)
      expect(height).toBeGreaterThanOrEqual(44)
    })
  })

  test('mobile chart accessibility', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375 })
    
    render(<SentimentTrendChart data={mockChartData} />)
    
    // Verify mobile chart has gesture instructions
    expect(screen.getByText(/swipe to navigate chart data/i)).toBeInTheDocument()
    
    // Verify chart zoom controls
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument()
    
    // Verify data table alternative for mobile
    expect(screen.getByRole('button', { name: 'View data table' })).toBeInTheDocument()
  })
})
```

### Success Criteria
- ✅ WCAG 2.1 AA compliance across all components
- ✅ Keyboard navigation supports all functionality
- ✅ Screen reader compatibility with proper announcements
- ✅ Color contrast ratios meet accessibility standards
- ✅ Focus management follows best practices
- ✅ Mobile touch targets meet minimum size requirements
- ✅ Charts provide accessible data alternatives

---

## Visual Regression Testing Plan

### Scope & Objectives
- Detect unintended visual changes across components
- Ensure consistent UI across browsers and devices
- Validate responsive design implementations
- Monitor design system consistency

### Visual Testing Strategy

#### Component-Level Visual Testing
```typescript
// tests/visual/component-visual.test.ts

describe('Component Visual Regression', () => {
  test('journal entry editor visual consistency', async ({ page }) => {
    await page.goto('/journal/new')
    
    // Wait for component to fully load
    await page.waitForSelector('[data-testid="journal-entry-editor"]')
    
    // Take baseline screenshot
    await expect(page.getByTestId('journal-entry-editor')).toHaveScreenshot('journal-editor-empty.png')
    
    // Fill form and capture states
    await page.getByLabelText("What's on your mind?").fill('Test journal entry content')
    await page.getByTestId('relationship-picker').click()
    await page.getByText('Sarah Johnson').click()
    await page.getByTestId('mood-selector').getByText('😊').click()
    
    await expect(page.getByTestId('journal-entry-editor')).toHaveScreenshot('journal-editor-filled.png')
    
    // Test validation state
    await page.getByLabelText("What's on your mind?").clear()
    await page.getByRole('button', { name: 'Save Entry' }).click()
    
    await expect(page.getByTestId('journal-entry-editor')).toHaveScreenshot('journal-editor-validation-error.png')
  })

  test('dashboard components visual consistency', async ({ page }) => {
    await signInAs('activeuser@example.com', page)
    await page.goto('/dashboard')
    
    // Wait for all dashboard components to load
    await page.waitForSelector('[data-testid="health-score-card"]')
    await page.waitForSelector('[data-testid="trend-chart"]')
    await page.waitForSelector('[data-testid="recent-activity"]')
    
    // Capture full dashboard
    await expect(page.getByTestId('dashboard-container')).toHaveScreenshot('dashboard-overview.png')
    
    // Capture individual components
    await expect(page.getByTestId('health-score-card').first()).toHaveScreenshot('health-score-card.png')
    await expect(page.getByTestId('trend-chart')).toHaveScreenshot('sentiment-trend-chart.png')
    await expect(page.getByTestId('recent-activity')).toHaveScreenshot('recent-activity-list.png')
  })

  test('mood selector visual states', async ({ page }) => {
    await page.goto('/journal/new')
    
    const moodSelector = page.getByTestId('mood-selector')
    
    // Default state
    await expect(moodSelector).toHaveScreenshot('mood-selector-default.png')
    
    // Hover state
    await moodSelector.getByText('😊').hover()
    await expect(moodSelector).toHaveScreenshot('mood-selector-hover.png')
    
    // Selected state
    await moodSelector.getByText('😊').click()
    await expect(moodSelector).toHaveScreenshot('mood-selector-selected.png')
    
    // With all moods visible
    await moodSelector.click() // Open dropdown if applicable
    await expect(moodSelector).toHaveScreenshot('mood-selector-expanded.png')
  })
})
```

#### Responsive Design Visual Testing
```typescript
describe('Responsive Visual Regression', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'wide', width: 1920, height: 1080 }
  ]

  viewports.forEach(viewport => {
    test(`dashboard layout at ${viewport.name} viewport`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await signInAs('activeuser@example.com', page)
      await page.goto('/dashboard')
      
      // Wait for responsive layout to settle
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot(`dashboard-${viewport.name}.png`, {
        fullPage: true
      })
    })

    test(`journal entry form at ${viewport.name} viewport`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await signInAs('activeuser@example.com', page)
      await page.goto('/journal/new')
      
      await page.waitForSelector('[data-testid="journal-entry-editor"]')
      await page.waitForTimeout(500)
      
      await expect(page).toHaveScreenshot(`journal-form-${viewport.name}.png`, {
        fullPage: true
      })
    })
  })
})
```

#### Chart Visual Testing
```typescript
describe('Chart Visual Regression', () => {
  test('sentiment trend chart visual consistency', async ({ page }) => {
    await signInAs('poweruser@example.com', page)
    await page.goto('/dashboard')
    
    // Wait for chart to fully render
    await page.waitForSelector('[data-testid="sentiment-trend-chart"] canvas')
    await page.waitForTimeout(1000) // Allow for chart animations
    
    const chartContainer = page.getByTestId('sentiment-trend-chart')
    
    // Default view
    await expect(chartContainer).toHaveScreenshot('sentiment-chart-default.png')
    
    // Different time ranges
    await page.getByRole('combobox', { name: 'Time Range' }).selectOption('week')
    await page.waitForTimeout(500)
    await expect(chartContainer).toHaveScreenshot('sentiment-chart-week.png')
    
    await page.getByRole('combobox', { name: 'Time Range' }).selectOption('quarter')
    await page.waitForTimeout(500)
    await expect(chartContainer).toHaveScreenshot('sentiment-chart-quarter.png')
    
    // Hover interactions
    await chartContainer.locator('canvas').hover({ position: { x: 200, y: 100 } })
    await page.waitForTimeout(200)
    await expect(chartContainer).toHaveScreenshot('sentiment-chart-hover.png')
  })

  test('health score breakdown chart', async ({ page }) => {
    await signInAs('poweruser@example.com', page)
    await page.goto('/dashboard')
    
    // Open health score details
    await page.getByTestId('health-score-card').first().click()
    await page.waitForSelector('[data-testid="health-score-breakdown"]')
    await page.waitForTimeout(500)
    
    const breakdownChart = page.getByTestId('health-score-breakdown')
    await expect(breakdownChart).toHaveScreenshot('health-score-breakdown.png')
    
    // Test different chart types
    await page.getByRole('button', { name: 'Radar Chart' }).click()
    await page.waitForTimeout(500)
    await expect(breakdownChart).toHaveScreenshot('health-score-radar.png')
    
    await page.getByRole('button', { name: 'Bar Chart' }).click()
    await page.waitForTimeout(500)
    await expect(breakdownChart).toHaveScreenshot('health-score-bars.png')
  })
})
```

#### Cross-Browser Visual Testing
```typescript
describe('Cross-Browser Visual Consistency', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test.describe(`${browserName} visual consistency`, () => {
      test('dashboard renders consistently', async ({ page }) => {
        await signInAs('crossbrowser@example.com', page)
        await page.goto('/dashboard')
        await page.waitForLoadState('networkidle')
        
        await expect(page).toHaveScreenshot(`dashboard-${browserName}.png`, {
          fullPage: true,
          threshold: 0.3 // Allow for minor font rendering differences
        })
      })

      test('form components render consistently', async ({ page }) => {
        await signInAs('crossbrowser@example.com', page)
        await page.goto('/journal/new')
        await page.waitForSelector('[data-testid="journal-entry-editor"]')
        
        // Fill form to test various states
        await page.getByLabelText("What's on your mind?").fill('Cross-browser test entry')
        await page.getByTestId('relationship-picker').click()
        await page.getByText('Sarah Johnson').click()
        await page.getByTestId('mood-selector').getByText('😊').click()
        
        await expect(page.getByTestId('journal-entry-editor')).toHaveScreenshot(
          `journal-form-filled-${browserName}.png`,
          { threshold: 0.3 }
        )
      })
    })
  })
})
```

#### Dark Mode Visual Testing
```typescript
describe('Dark Mode Visual Regression', () => {
  test('dashboard dark mode consistency', async ({ page }) => {
    await signInAs('darkmode@example.com', page)
    
    // Enable dark mode
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await page.waitForTimeout(500) // Allow for theme transition
    
    await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
      fullPage: true
    })
  })

  test('form components dark mode', async ({ page }) => {
    await signInAs('darkmode@example.com', page)
    await page.goto('/journal/new')
    
    // Enable dark mode
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await page.waitForTimeout(500)
    
    await expect(page.getByTestId('journal-entry-editor')).toHaveScreenshot('journal-form-dark-mode.png')
    
    // Test form validation in dark mode
    await page.getByRole('button', { name: 'Save Entry' }).click()
    await expect(page.getByTestId('journal-entry-editor')).toHaveScreenshot('journal-form-validation-dark-mode.png')
  })

  test('charts dark mode rendering', async ({ page }) => {
    await signInAs('darkmode@example.com', page)
    await page.goto('/dashboard')
    
    // Enable dark mode
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await page.waitForTimeout(1000) // Allow for chart re-rendering
    
    const chartContainer = page.getByTestId('sentiment-trend-chart')
    await expect(chartContainer).toHaveScreenshot('sentiment-chart-dark-mode.png')
  })
})
```

### Visual Testing Configuration

#### Playwright Visual Config
```typescript
// playwright.config.ts (visual testing specific config)
export default defineConfig({
  // ... other config
  
  expect: {
    // Global screenshot comparison threshold
    toHaveScreenshot: { threshold: 0.2 },
    toMatchSnapshot: { threshold: 0.2 }
  },
  
  use: {
    // Font rendering consistency
    fontFamily: 'Arial, sans-serif',
    
    // Animation handling
    reducedMotion: 'reduce',
    
    // Screenshot settings
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    }
  },
  
  // Visual testing specific projects
  projects: [
    {
      name: 'visual-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Disable animations for consistent screenshots
        reducedMotion: 'reduce'
      }
    },
    {
      name: 'visual-firefox',
      use: { 
        ...devices['Desktop Firefox'],
        reducedMotion: 'reduce'
      }
    },
    {
      name: 'visual-webkit',
      use: { 
        ...devices['Desktop Safari'],
        reducedMotion: 'reduce'
      }
    }
  ]
})
```

#### Visual Test Utilities
```typescript
// test-utils/visual-helpers.ts

export async function waitForChartToRender(page: Page, chartSelector: string) {
  // Wait for chart canvas to be present
  await page.waitForSelector(`${chartSelector} canvas`)
  
  // Wait for chart animations to complete
  await page.waitForTimeout(1000)
  
  // Verify chart has content (not empty)
  const chartBounds = await page.locator(`${chartSelector} canvas`).boundingBox()
  expect(chartBounds.width).toBeGreaterThan(0)
  expect(chartBounds.height).toBeGreaterThan(0)
}

export async function stabilizeAnimations(page: Page) {
  // Disable CSS animations
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `
  })
}

export async function mockImageLoading(page: Page) {
  // Replace images with placeholder to avoid loading inconsistencies
  await page.route('**/*.{png,jpg,jpeg,gif,svg}', route => {
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from('placeholder-image')
    })
  })
}
```

### Success Criteria
- ✅ Visual consistency across all major browsers
- ✅ Responsive design maintains visual integrity
- ✅ Charts render consistently with proper theming
- ✅ Form states visually consistent
- ✅ Dark mode implementation visually correct
- ✅ Visual regression detection <5% false positives
- ✅ Screenshot comparison threshold optimized for stability

---

This comprehensive testing documentation provides detailed test plans for all critical aspects of the Resonant application. Each plan includes specific test scenarios, implementation details, and success criteria tailored to the application's technology stack and requirements.