# Testing Strategy & Framework Documentation

## Overview

This document outlines the comprehensive testing strategy for the Resonant relationship health journal application, built with Next.js 15, Convex real-time backend, Clerk authentication, and AI-powered insights.

## Table of Contents

1. [Testing Strategy Framework](#testing-strategy-framework)
2. [Testing Pyramid Implementation](#testing-pyramid-implementation)
3. [Test Environment Strategy](#test-environment-strategy)
4. [Quality Gates & CI/CD Integration](#quality-gates--cicd-integration)
5. [Test Configuration & Setup](#test-configuration--setup)
6. [Testing Best Practices](#testing-best-practices)

---

## Testing Strategy Framework

### Core Testing Philosophy

Our testing strategy follows these principles:

- **User-Centric Testing**: Focus on user behavior and experiences rather than implementation details
- **Real-Time Data Testing**: Comprehensive testing of Convex real-time features
- **AI Pipeline Testing**: Robust testing of AI analysis components with DSPy integration
- **Security-First**: Comprehensive authentication and data privacy testing
- **Performance-Aware**: Testing for real-time performance and scalability

### Technology Stack Testing Requirements

| Technology                     | Testing Approach                      | Key Challenges                   |
| ------------------------------ | ------------------------------------- | -------------------------------- |
| **Next.js 15 (App Router)**    | Component testing, routing, SSR/CSR   | Server components, streaming     |
| **Convex Backend**             | Real-time data sync, function testing | Live data, subscription testing  |
| **Clerk Authentication**       | Auth flow testing, session management | Multi-provider auth, webhooks    |
| **TypeScript**                 | Type safety, validation testing       | Strict typing, schema validation |
| **AI Analysis (Gemini Flash)** | API testing, response validation      | Rate limiting, error handling    |
| **Chart.js/Recharts**          | Data visualization testing            | Canvas rendering, interactions   |

---

## Testing Pyramid Implementation

### Level 1: Unit Tests (70% of tests)

**Tools**: Jest, React Testing Library, @testing-library/jest-dom

**Scope**:

- Individual component logic
- Utility functions and helpers
- Validation schemas (Zod)
- AI analysis functions
- Chart data processing
- Form validation logic

**Coverage Targets**:

- Functions: 90%+
- Branches: 85%+
- Lines: 90%+

**Example Structure**:

```
src/
├── components/features/journal/__tests__/
│   ├── journal-entry-editor.test.tsx
│   ├── mood-selector.test.tsx
│   ├── tag-input.test.tsx
│   └── relationship-picker.test.tsx
├── hooks/__tests__/
│   ├── use-auto-save.test.ts
│   └── use-journal-entries.test.ts
└── lib/__tests__/
    ├── validations.test.ts
    ├── ai/analysis.test.ts
    └── chart-utils.test.ts
```

### Level 2: Integration Tests (20% of tests)

**Tools**: React Testing Library, Convex test utilities, Jest

**Scope**:

- Component integration with Convex hooks
- Form submission workflows
- Real-time data synchronization
- Authentication state management
- Dashboard data aggregation
- Search functionality
- AI analysis pipeline

**Key Test Areas**:

```typescript
// Dashboard Integration
describe('Dashboard Integration', () => {
  it('should sync real-time data across components')
  it('should handle Convex connection failures gracefully')
  it('should update charts when new journal entries are added')
})

// Authentication Integration
describe('Authentication Flow', () => {
  it('should redirect unauthenticated users')
  it('should sync user data with Convex')
  it('should handle webhook user synchronization')
})
```

### Level 3: End-to-End Tests (10% of tests)

**Tools**: Playwright, Playwright MCP (for Claude Code)

**Scope**:

- Complete user journeys
- Cross-browser compatibility
- Mobile responsiveness
- Real authentication flows
- Performance benchmarks

---

## Test Environment Strategy

### Environment Configuration

#### Development Environment

```bash
# .env.test
NEXT_PUBLIC_CONVEX_URL=https://test-deployment.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_test_...
GOOGLE_GEMINI_API_KEY=test_api_key
NODE_ENV=test
```

#### Test Data Management

- **4 Test User Personas**: New, Active, Power, Edge Case users
- **Isolated Test Database**: Separate Convex deployment for testing
- **Deterministic Test Data**: Consistent, reproducible test scenarios
- **Data Cleanup**: Automated cleanup after test runs

#### Mock Strategy

```typescript
// Convex Mocking Pattern
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useAction: jest.fn(),
}))

// AI Service Mocking
jest.mock('@/lib/ai/gemini-client', () => ({
  analyzeJournalEntry: jest.fn(),
  generateInsights: jest.fn(),
}))
```

### Test User Personas

#### 1. New User (Empty State)

```typescript
const newUser = {
  id: 'test_new_user',
  relationships: [],
  journalEntries: [],
  healthScores: [],
  onboardingCompleted: false,
}
```

#### 2. Active User (Moderate Data)

```typescript
const activeUser = {
  id: 'test_active_user',
  relationships: 3,
  journalEntries: 15,
  healthScores: 'current',
  lastActiveAt: Date.now() - 86400000, // 1 day ago
}
```

#### 3. Power User (Extensive Data)

```typescript
const powerUser = {
  id: 'test_power_user',
  relationships: 10,
  journalEntries: 200,
  healthScores: 'comprehensive',
  features: ['voice-journaling', 'advanced-analytics'],
}
```

#### 4. Edge Case User (Boundary Conditions)

```typescript
const edgeCaseUser = {
  id: 'test_edge_user',
  specialCharacters: true,
  extremeDataVolumes: true,
  borderlineScenarios: true,
}
```

---

## Quality Gates & CI/CD Integration

### Pre-Commit Hooks

```bash
# .husky/pre-commit
#!/usr/bin/env sh
npm run lint
npm run typecheck
npm run format:check
npm run test:ci
```

### CI Pipeline Stages

#### Stage 1: Code Quality

```yaml
quality_checks:
  - ESLint validation
  - TypeScript compilation
  - Prettier formatting
  - Dependency audit
```

#### Stage 2: Unit & Integration Tests

```yaml
test_suite:
  - Jest unit tests (parallel execution)
  - Component integration tests
  - Coverage reporting
  - Test result aggregation
```

#### Stage 3: E2E Testing

```yaml
e2e_tests:
  parallel:
    - Authentication flows
    - User journeys
    - Advanced features
  browsers: [chromium, firefox, webkit]
  devices: [desktop, mobile]
```

#### Stage 4: Performance & Security

```yaml
advanced_testing:
  - Performance benchmarks
  - Security scanning
  - Accessibility audit
  - Visual regression tests
```

### Test Commands Integration

```json
{
  "scripts": {
    "test": "jest",
    "test:ci": "jest --ci --coverage --passWithNoTests",
    "test:e2e": "playwright test",
    "ci:test-pipeline": "npm run test:setup:validate && npm run test:ci:auth && npm run test:ci:journeys && npm run test:ci:advanced && npm run test:report:generate"
  }
}
```

---

## Test Configuration & Setup

### Jest Configuration

```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/convex/_generated/api$': '<rootDir>/convex/_generated/api',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

### Playwright Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? undefined : 1,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
```

### Test Setup Files

```typescript
// jest.setup.js
import '@testing-library/jest-dom'

// Mock Convex hooks globally
jest.mock('convex/react', () => ({
  useQuery: jest.fn(() => undefined),
  useMutation: jest.fn(() => jest.fn()),
  useAction: jest.fn(() => jest.fn()),
}))

// Mock Clerk authentication
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(() => ({
    user: { id: 'test_user', email: 'test@example.com' },
    isLoaded: true,
  })),
  useAuth: jest.fn(() => ({
    userId: 'test_user',
    isLoaded: true,
  })),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))
```

---

## Testing Best Practices

### Component Testing Patterns

#### 1. Test User Behavior, Not Implementation

```typescript
// ❌ Bad - Testing implementation details
expect(component.state.isLoading).toBe(true)

// ✅ Good - Testing user-visible behavior
expect(screen.getByText('Saving...')).toBeInTheDocument()
expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
```

#### 2. Use Meaningful Test Data

```typescript
const mockJournalEntry = {
  _id: 'entry_123',
  content: 'Had a great conversation with Sarah today about our future plans',
  mood: 'happy',
  relationshipId: 'rel_sarah_001',
  tags: ['communication', 'future-planning'],
  createdAt: Date.now() - 3600000, // 1 hour ago
}
```

#### 3. Mock External Dependencies Appropriately

```typescript
// Mock Convex queries with realistic responses
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>
mockUseQuery.mockReturnValue([
  { _id: 'entry1', content: 'Test entry 1' },
  { _id: 'entry2', content: 'Test entry 2' },
])
```

### Real-Time Testing Patterns

#### Testing Convex Subscriptions

```typescript
describe('Real-time Updates', () => {
  it('should update UI when new journal entry is added', async () => {
    const { rerender } = render(<JournalEntriesList />)

    // Initial state
    expect(screen.getByText('No entries yet')).toBeInTheDocument()

    // Simulate real-time update
    mockUseQuery.mockReturnValue([newEntry])
    rerender(<JournalEntriesList />)

    expect(screen.getByText(newEntry.content)).toBeInTheDocument()
  })
})
```

### AI Testing Patterns

#### Testing AI Analysis Components

```typescript
describe('AI Analysis', () => {
  it('should handle API rate limits gracefully', async () => {
    const mockAnalyzeEntry = analyzeJournalEntry as jest.Mock
    mockAnalyzeEntry.mockRejectedValue(new Error('Rate limit exceeded'))

    render(<SentimentAnalysis entry={mockEntry} />)

    await waitFor(() => {
      expect(screen.getByText(/analysis temporarily unavailable/i)).toBeInTheDocument()
    })
  })
})
```

### Error Handling Testing

```typescript
describe('Error Boundaries', () => {
  it('should catch and display component errors', () => {
    const ThrowError = () => { throw new Error('Test error') }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })
})
```

### Accessibility Testing Integration

```typescript
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

describe('Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<JournalEntryEditor />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

---

## Test Reporting & Monitoring

### Coverage Reporting

- **Jest Coverage**: Built-in coverage reporting with HTML output
- **SonarQube Integration**: Code quality and test coverage monitoring
- **Coverage Trends**: Track coverage changes over time

### Test Result Aggregation

```typescript
// scripts/generate-test-report.js
const testResults = {
  unit: require('../coverage/coverage-summary.json'),
  e2e: require('../test-results/results.json'),
  performance: require('../test-results/lighthouse.json'),
}

// Generate comprehensive test report
generateReport(testResults)
```

### Performance Metrics

- **Test Execution Time**: Monitor test suite performance
- **Coverage Generation**: Track coverage report generation time
- **E2E Test Duration**: Monitor end-to-end test execution

This testing strategy provides comprehensive coverage while maintaining development velocity and ensuring high-quality releases for the Resonant application.
