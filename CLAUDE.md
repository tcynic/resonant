# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Resonant is a relationship health journal application built with Next.js 15, React 19, TypeScript, and real-time Convex backend. The app enables users to track relationship wellness through journaling, mood tracking, and AI-powered insights.

## Core Development Commands

### Development Setup

```bash
# CRITICAL: Both development servers MUST run simultaneously for full functionality
npm run dev          # Terminal 1: Next.js with Turbopack (localhost:3000)
npm run convex:dev   # Terminal 2: Convex real-time backend + dashboard

# Environment setup
cp .env.local.template .env.local  # Copy and configure environment variables
```

### Code Quality & Testing

```bash
# Unit & Component Testing
npm test                # Run all Jest tests
npm test:watch         # Run tests in watch mode
npm test:ci            # Run tests with coverage for CI
npm test -- --testPathPatterns="component-name"  # Run specific test file

# E2E Testing (Standard Playwright)
npm run test:e2e       # Run standard Playwright tests
npm run test:e2e:ui    # Playwright with UI mode
npm run test:e2e:debug # Playwright debug mode
npm run test:e2e:headed # Playwright headed mode
npm run test:e2e:report # View test reports

# Advanced E2E Testing Pipeline
npm run test:setup:validate    # Validate test environment setup
npm run test:ci:auth          # Run authentication tests for CI
npm run test:ci:journeys      # Run user journey tests for CI
npm run test:ci:advanced      # Run advanced feature tests for CI
npm run ci:test-pipeline      # Complete CI test pipeline
npm run test:report:generate  # Generate comprehensive test reports

# Code Quality
npm run lint           # ESLint checking
npm run lint:fix       # Auto-fix ESLint issues
npm run format         # Prettier formatting
npm run format:check   # Check Prettier formatting
npm run typecheck      # TypeScript validation

# Build commands
npm run build          # Production build
npm run convex:deploy  # Deploy Convex functions to production
```

### Testing Strategy

- **Unit Tests**: Located in `__tests__` directories adjacent to components
- **Component Tests**: Use React Testing Library with Jest DOM matchers
- **E2E Tests**: Standard Playwright for automated browser testing
- **Test Pattern**: `ComponentName.test.tsx` for components, `fileName.test.ts` for utilities

### Test User Personas

The system includes 4 comprehensive test user personas for thorough testing:

- **New User**: Empty state for onboarding and first-use testing
- **Active User**: Moderate data set for typical user workflows
- **Power User**: Extensive data for performance and scalability testing
- **Edge Case User**: Boundary conditions, special characters, and edge scenarios

## Architecture Overview

### Technology Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 4
- **Backend**: Convex (real-time database + serverless functions)
- **Authentication**: Clerk with Next.js integration
- **Development**: Turbopack for fast development builds
- **Testing**: Jest + React Testing Library + Playwright
- **Validation**: Zod schemas for type-safe form and API validation
- **Charts & Analytics**: Chart.js, Recharts, and date-fns for data visualization

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes (sign-in, sign-up)
│   ├── journal/           # Journal entry pages and [id] routes
│   ├── relationships/     # Relationship management
│   ├── dashboard/         # Main dashboard with insights
│   └── search/            # Global search functionality
├── components/
│   ├── features/          # Feature-specific components
│   │   ├── journal/       # Journal entry components + tests
│   │   ├── relationships/ # Relationship components + tests
│   │   ├── dashboard/     # Dashboard and analytics components
│   │   ├── insights/      # Chart and analytics components
│   │   ├── search/        # Search functionality components
│   │   ├── notifications/ # Reminder and notification system
│   │   └── data-management/ # Privacy, export, and data controls
│   ├── ui/               # Reusable UI components
│   └── providers/        # React context providers
├── hooks/                # Custom React hooks
├── lib/                  # Shared utilities and types
└── middleware.ts         # Clerk authentication middleware

convex/                   # Backend functions and schema
├── schema.ts            # Database schema definitions
├── journalEntries.ts    # Journal CRUD operations
├── relationships.ts     # Relationship CRUD operations
├── users.ts            # User management functions
├── insights.ts         # Chart data and analytics functions
├── monitoring/         # AI system monitoring and observability
│   ├── success_rate_tracking.ts  # AI analysis success metrics
│   ├── failure_detection.ts      # Automated failure detection
│   ├── health_checks.ts          # System health monitoring
│   ├── cost_monitoring.ts        # AI usage cost tracking
│   └── alerting_system.ts        # Real-time alert management
├── scheduler/          # Background job processing
│   ├── analysis_queue.ts         # AI analysis job queue
│   ├── queue_maintenance.ts      # Queue health management
│   └── failure_detection_scheduler.ts  # Automated failure detection
├── fallback/          # AI fallback systems
│   ├── sentiment_analysis.ts    # Local sentiment analysis
│   ├── pattern_matching.ts      # Pattern recognition fallbacks
│   └── integration.ts           # Fallback orchestration
└── utils/             # Shared utilities
    ├── circuit_breaker.ts       # Circuit breaker pattern
    ├── retry_strategy.ts        # Retry logic with exponential backoff
    └── ai_bridge.ts            # AI service abstraction layer
```

### Database Schema (Convex)

- **users**: User profiles with Clerk integration, subscription tiers, preferences
- **relationships**: User's relationship definitions with photo/metadata
- **journalEntries**: Journal content with mood/tags/relationships
- **healthScores**: AI-calculated relationship health metrics
- **insights**: Chart data and analytics with caching for performance
- **aiAnalysis**: AI processing results with metadata and status tracking
- **analysisQueue**: Background job queue for AI processing with priorities
- **failureDetections**: Automated failure detection and root cause analysis
- **circuitBreakerStates**: Circuit breaker status for service reliability
- **notifications**: Reminder system with user preferences and scheduling

### Key Components Architecture

#### Journal System

- **journal-entry-editor**: Main form for creating/editing entries
- **mood-selector**: 10 mood types with emoji interface
- **tag-input**: Dynamic tag system with suggestions and autocomplete
- **relationship-picker**: Multi-select component with photo/initial display
- **journal-entry-card**: Display component for entry lists

#### Insights & Analytics System

- **sentiment-trend-chart**: Visualizes mood trends over time using Chart.js
- **health-score-chart**: Displays relationship health metrics with Recharts
- **relationship-comparison-chart**: Comparative analytics across relationships
- **time-range-selector**: Interactive date range picker for analytics
- **chart-export-button**: Export charts as images or data files
- **base-chart**: Shared chart configuration and theming

#### AI System Monitoring & Admin Dashboard

- **monitoring-dashboard**: Main admin interface for system oversight
- **success-rate-dashboard**: AI analysis success metrics and trends
- **failure-analysis-dashboard**: Automated failure detection with root cause analysis
- **circuit-breaker-dashboard**: Service reliability and circuit breaker status
- **cost-monitoring-dashboard**: AI usage costs and budget tracking
- **health-check-dashboard**: Real-time system health monitoring

#### Background Processing Architecture

- **Analysis Queue System**: Prioritized job processing with failure recovery
- **Circuit Breaker Pattern**: Automatic service protection with fallback mechanisms
- **Retry Strategy**: Exponential backoff with jitter for resilient operations
- **Failure Detection**: Automated anomaly detection with pattern recognition
- **Monitoring Pipeline**: Real-time metrics collection and alerting

#### Authentication Flow

- Clerk handles all authentication with middleware protection
- Public routes: `/`, `/sign-in/*`, `/sign-up/*`
- Protected routes: All others require authentication
- User sync: Automatic Convex user creation via Clerk webhooks

**Webhook Setup for User Synchronization:**

1. **Create Webhook in Clerk Dashboard:**
   - Go to Clerk Dashboard > Webhooks
   - Create new webhook pointing to: `https://yourdomain.com/api/webhooks/clerk`
   - Select events: `user.created`, `user.updated`, `user.deleted`
   - Copy the webhook secret

2. **Environment Configuration:**

   ```bash
   # Add to .env.local
   CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

3. **Automatic Fallback:**
   - Uses `useConvexUser()` hook for client-side user sync fallback
   - Automatically creates missing users when they access the application
   - Handles webhook failures gracefully

#### Type Safety

- Shared types in `src/lib/types.ts` cover all data models
- Zod validation schemas in `src/lib/validations.ts`
- End-to-end type safety from database to UI components
- Custom TypeScript configurations for strict mode

## Development Workflows

### Feature Development

1. **Database First**: Define/update Convex schema if needed
2. **Types**: Update TypeScript interfaces in `src/lib/types.ts`
3. **Backend**: Create/update Convex functions for data operations
4. **Frontend**: Build React components with TypeScript
5. **Testing**: Write comprehensive tests alongside development
6. **Integration**: Test with real Convex backend in development

### Testing Approach

- **Component Tests**: Focus on user interactions and behaviors
- **Mock Strategy**: Mock Convex hooks using Jest, not implementation details
- **Test Data**: Use realistic test data that matches production schemas
- **Coverage**: Aim for comprehensive test coverage of user-facing functionality

### Common Patterns

#### Convex Data Fetching

```typescript
// Query pattern
const journalEntries = useQuery(api.journalEntries.list, { userId: user?.id })

// Mutation pattern
const createEntry = useMutation(api.journalEntries.create)

// Analytics data fetching
const trendData = useQuery(api.insights.getTrendData, {
  userId: user?.id,
  timeRange,
  analyticsType: 'sentiment_trend',
})
```

#### Form Handling

```typescript
// Zod validation with TypeScript inference
const schema = z.object({...})
type FormData = z.infer<typeof schema>
```

#### Component Testing

```typescript
// Standard test pattern
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// Test user interactions, not implementation details
```

## Environment Configuration

### Required Environment Variables

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=         # From npx convex dev

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=  # From Clerk dashboard
CLERK_SECRET_KEY=                   # From Clerk dashboard

# AI Features (Gemini 2.5 Flash-Lite)
GOOGLE_GEMINI_API_KEY=              # For Gemini 2.5 Flash-Lite AI analysis
```

### Development Dependencies

- **CRITICAL**: Both `npm run dev` (Turbopack) and `npm run convex:dev` must be running simultaneously
- Clerk development keys work in development mode
- Real-time updates require active Convex connection
- Convex dashboard accessible during `npm run convex:dev` for real-time debugging

### Build and Deployment

The project uses sophisticated build processes for reliability:

```bash
# Standard build with optional Convex codegen
npm run build                    # Handles Convex codegen failures gracefully

# Convex operations with error handling
npm run convex:codegen-optional  # Graceful fallback to stub files if needed
npm run convex:deploy           # Deploy backend functions

# Vercel deployment with validation
npm run vercel-build            # Optimized build for Vercel
npm run validate:vercel         # Validate deployment configuration
npm run verify:build-env        # Verify environment variables

# Health checking and monitoring
npm run deploy:health-check     # Post-deployment health validation
npm run test:performance        # Performance monitoring
```

## Known Issues and Workarounds

### Convex-Test Library TypeScript Limitations

The `convex-test` library has TypeScript definition limitations that cause compiler errors in test files:

- **Issue**: `withIndex()` calls show TypeScript errors like "Argument of type 'by_model_type' is not assignable to parameter of type 'keyof SystemIndexes'"
- **Cause**: The convex-test library's TypeScript definitions don't include custom schema indexes
- **Impact**: Tests function correctly at runtime despite TypeScript warnings
- **Solution**:
  - ESLint rules configured to suppress these warnings in Convex test files
  - `@ts-ignore` comments added for known issues
  - Use `--typecheck=disable` for Convex deployment when needed

### TypeScript Deep Type Instantiation Issues

Convex queries may cause "Type instantiation is excessively deep and possibly infinite" errors:

- **Root Cause**: Complex Convex type inference with deeply nested data structures
- **Impact**: TypeScript compiler errors but runtime functionality works correctly
- **CI/CD Solution**: GitHub Actions configured to allow TypeScript warnings to pass
- **Development Workaround**: Use `as unknown` type assertions for problematic queries

```bash
# Deploy despite TypeScript errors (when they're known convex-test limitations)
npx convex dev --once --typecheck=disable
npx convex deploy --typecheck=disable
```

### GitHub Actions CI/CD Pipeline

The CI pipeline includes sophisticated error handling:

```yaml
# TypeScript check allows warnings to pass
- name: Run TypeScript check
  run: npm run typecheck || echo "TypeScript check completed with warnings"
```

- **Quality Checks**: ESLint, Prettier, TypeScript validation, and build verification
- **Test Pipeline**: Unit tests, E2E tests, and comprehensive test reporting
- **Environment Handling**: Graceful fallbacks for missing environment variables
- **Artifact Management**: Test reports, coverage data, and deployment summaries

## Debugging and Development Tips

### Convex Development

- Convex dashboard available during `npm run convex:dev`
- Real-time function logs and database inspection
- TypeScript errors show in Convex console

### Authentication Debugging

- Clerk provides development mode indicators
- Use Clerk dashboard for user management during development
- Authentication flow can be tested with real email addresses

### Component Development

- All components have comprehensive test suites
- Use existing test patterns when creating new components
- Component tests focus on user behavior, not implementation details

## Code Quality Standards

- **TypeScript**: Strict mode enabled, no `any` types
- **Testing**: Comprehensive test coverage for all features
- **Formatting**: Prettier with ESLint integration
- **Components**: Functional components with TypeScript
- **Imports**: Absolute imports using `@/` path mapping
- **Validation**: Zod schemas for all form and API validation

## TypeScript Best Practices: Avoiding `any` Types

The `@typescript-eslint/no-explicit-any` rule helps prevent using the `any` type, which disables TypeScript's type checking and can lead to runtime errors.

### Why Avoid `any`?

- `any` bypasses all type checking
- It's "infectious" - spreads through your codebase
- Can hide bugs that TypeScript would normally catch
- Makes refactoring harder

### Common Patterns to Replace `any`

1. **Use `unknown` instead of `any` for truly unknown types**:

   ```typescript
   // ❌ Bad
   function parseData(data: any) { ... }

   // ✅ Good
   function parseData(data: unknown) { ... }
   ```

2. **For JSON parsing, use `unknown`**:

   ```typescript
   // ❌ Bad
   const data = JSON.parse(raw) // implicitly any

   // ✅ Good
   const data: unknown = JSON.parse(raw)
   ```

3. **For function parameters, define specific types**:

   ```typescript
   // ❌ Bad
   function greet(friend: any) { ... }

   // ✅ Good
   function greet(friend: string) { ... }
   // or
   function greet(friend: { name: string }) { ... }
   ```

4. **For arrays, specify element types**:

   ```typescript
   // ❌ Bad
   const items: any[] = []

   // ✅ Good
   const items: string[] = []
   const items: Array<string | number> = []
   ```

5. **For test mocks, use specific types or type assertions**:

   ```typescript
   // ❌ Bad
   const mockFn = jest.fn((api: any, args: any) => { ... });

   // ✅ Good
   const mockFn = jest.fn((api: unknown, ...args: unknown[]) => { ... });
   // or create specific mock types
   type MockQuery = jest.MockedFunction<typeof useQuery>;
   ```

6. **For object types, define interfaces or use Record**:

   ```typescript
   // ❌ Bad
   const config: any = {};

   // ✅ Good
   const config: Record<string, unknown> = {};
   // or define specific interface
   interface Config { ... }
   ```

7. **For type assertions, prefer `unknown` first**:

   ```typescript
   // ❌ Bad
   const userId = user.id as any

   // ✅ Good
   const userId = user.id as string
   // or if truly unknown
   const userId = user.id as unknown as string
   ```

### Special Cases

- **Convex/Database IDs**: When dealing with database IDs that have specific types, use type assertions sparingly and document why
- **Third-party libraries**: If types are missing, consider adding type definitions or using `unknown`
- **Migration code**: Use `// @ts-expect-error` with explanation instead of `any`

### ESLint Configuration

These rules are configured to catch `any` usage:

```javascript
{
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-unsafe-assignment": "error",
  "@typescript-eslint/no-unsafe-member-access": "error",
  "@typescript-eslint/no-unsafe-call": "error",
  "@typescript-eslint/no-unsafe-return": "error",
  "@typescript-eslint/no-unsafe-argument": "error"
}
```

## Code Quality Checklist

- Run prettier to check code formatting

## Critical Architecture Patterns

### AI System Reliability

The application implements enterprise-grade reliability patterns:

- **Circuit Breaker Pattern**: Automatic service protection with fallback to local processing
- **Queue-Based Processing**: Asynchronous AI analysis with priority handling and retries
- **Graceful Degradation**: System continues functioning even when AI services are unavailable
- **Monitoring & Alerting**: Real-time system health tracking with automated failure detection

### Error Handling Philosophy

- **Fail Fast, Recover Gracefully**: Quick error detection with automatic recovery mechanisms
- **User Experience First**: Never show technical errors to users, always provide meaningful fallbacks
- **Comprehensive Logging**: Detailed error tracking for debugging without exposing internals
- **Progressive Enhancement**: Core functionality works without AI, enhanced features require AI

### Data Architecture Principles

- **Real-time First**: Convex provides real-time updates across all data operations
- **Type Safety Throughout**: End-to-end TypeScript with Zod validation
- **Privacy by Design**: User data isolation and granular privacy controls
- **Scalable Schema**: Database design supports growth from individual users to enterprise scale

## Development Best Practices

- **Component-First Development**: Build reusable components with comprehensive test coverage
- **Database-First Architecture**: Define schema changes before implementing features
- **Test-Driven Reliability**: Write tests that validate user behavior, not implementation details
- **Performance Monitoring**: Use built-in performance scripts to track system health
- **Security-First Authentication**: Clerk integration with webhook-based user synchronization
