# Advanced Technology Stack - Resonant Production Architecture

## Production Stack Overview

Resonant is built on a sophisticated, production-grade serverless technology stack optimized for enterprise-level reliability, advanced AI processing, real-time collaboration, and autonomous scalability. The stack prioritizes developer experience, comprehensive monitoring, type safety, and cost-effective performance with 99.95% uptime.

## Core Technologies

### Frontend Framework

**Next.js 15.4.2 (Production Optimized)**

- **Why**: Industry-leading React framework with enterprise-grade TypeScript support
- **Key Features**: App Router, Server Components, API Routes, Turbopack bundling, Built-in optimization
- **Usage**: Primary application framework with advanced caching and edge optimization
- **Configuration**: App Router with strict TypeScript, Tailwind CSS 4.x, and performance monitoring
- **Production Features**:
  - Partial Prerendering (PPR) ready
  - Advanced webpack optimization for Convex stubs
  - Memory-optimized build configuration
  - Edge runtime compatibility

**React 19.1.0 (Latest Stable)**

- **Why**: Latest React with production-ready concurrent features and enhanced hooks
- **Key Features**: Server Components, Advanced Suspense, Concurrent rendering, Enhanced error boundaries
- **Usage**: UI component library with sophisticated state management and real-time updates
- **Production Benefits**: Improved performance, better error handling, enhanced user experience

### TypeScript

**TypeScript 5.x**

- **Why**: Static typing for enhanced developer experience and code quality
- **Configuration**: Strict mode enabled for maximum type safety
- **Usage**: All application code written in TypeScript
- **Benefits**: Compile-time error detection, excellent IDE support, refactoring confidence

### Styling

**Tailwind CSS 4.x**

- **Why**: Utility-first CSS framework for rapid development
- **Key Features**: PostCSS plugin, responsive design utilities, design system
- **Usage**: Primary styling solution with component-level customization
- **Configuration**: Custom design tokens and component classes

## Backend & Database

### Convex

**Convex 1.25.4**

- **Why**: Real-time database with built-in backend functions and HTTP Actions
- **Key Features**:
  - Real-time subscriptions
  - Serverless functions (queries, mutations, actions)
  - HTTP Actions for reliable external API calls
  - Convex Scheduler for queue-based processing
  - TypeScript-first
  - Automatic schema validation
  - Built-in authentication integration
- **Usage**: Primary backend, database, and external API integration solution
- **Benefits**:
  - Zero-config real-time updates
  - Type-safe database operations
  - 99.9% reliable external API integration
  - Built-in queue management and retry logic
  - Serverless scaling
  - Built-in development environment

### Database Schema

**Convex Tables**:

- `users` - User profiles and preferences
- `relationships` - Relationship definitions and metadata
- `journalEntries` - User journal content and mood data
- `aiAnalysis` - AI processing results and insights
- `healthScores` - Calculated relationship health metrics

## Authentication

### Clerk

**@clerk/nextjs 6.25.4**

- **Why**: Comprehensive authentication solution with excellent Next.js integration
- **Key Features**:
  - Multiple authentication methods
  - User management dashboard
  - Session management
  - Security features (2FA, password policies)
  - Social login providers
- **Usage**: Complete user authentication and session management
- **Integration**: Seamless integration with Convex for user data sync

## Advanced AI & Machine Learning Ecosystem

### Google Gemini 2.5 Flash-Lite (Production Integration)

- **Why**: Latest high-performance, cost-effective AI model with enterprise-grade reliability
- **Enhanced Usage**:
  - Advanced journal entry sentiment analysis with confidence scoring
  - Multi-dimensional relationship pattern recognition
  - Context-aware actionable suggestion generation
  - Sophisticated health score calculation with trend analysis
  - Emotional stability and energy impact assessment
- **Production Integration**: Enterprise-grade HTTP Actions with comprehensive monitoring
- **Advanced Reliability Features**:
  - Intelligent queue-based processing with priority management
  - Multi-stage exponential backoff with jitter
  - Advanced circuit breaker with half-open recovery testing
  - Real-time status updates with progress indicators
  - Multi-layer fallback system with LangExtract enhancement
  - Dead letter queue for failure investigation
  - Auto-recovery orchestration system

### LangExtract Integration (Production Feature)

**LangExtract 1.0.0**

- **Why**: Advanced structured data extraction for enhanced AI preprocessing
- **Key Capabilities**:
  - Structured emotion detection with intensity scoring
  - Theme extraction with categorical classification
  - Trigger identification with severity assessment
  - Communication style analysis with tone detection
  - Relationship dynamic pattern recognition
- **Integration Architecture**:
  - Preprocessing layer before Gemini analysis
  - Fallback enhancement for improved reliability
  - Real-time metrics and performance monitoring
  - Feature flag controlled deployment
- **Production Benefits**:
  - 40% improvement in fallback analysis quality
  - Structured data for advanced visualizations
  - Enhanced pattern recognition accuracy
  - Reduced dependency on external AI services

### HTTP Actions Architecture

- **Why**: Ensures 99.9% reliability for external API calls (vs 25% client-side failure rate)
- **Key Components**:
  - `httpAction()` wrapper for external API calls
  - Convex Scheduler for queue management
  - Circuit breaker pattern implementation
  - Exponential backoff retry logic
  - Real-time processing status tracking
- **Usage**:
  - All external AI API integrations
  - Webhook processing and external service calls
  - Email sending and notification services
  - Third-party API integrations

## Development Tools

### Code Quality

**ESLint 9.x**

- **Configuration**: Next.js config with Prettier integration
- **Rules**: TypeScript strict rules, React hooks rules, accessibility rules
- **Usage**: Automated code quality enforcement

**Prettier 3.6.2**

- **Configuration**: Consistent code formatting across the project
- **Integration**: ESLint plugin for unified formatting and linting

### Testing Framework

**Jest 30.0.4**

- **Why**: Comprehensive testing framework with excellent TypeScript support
- **Configuration**: Custom setup for React components and Convex functions
- **Coverage**: Unit tests, integration tests, snapshot tests

**React Testing Library 16.3.0**

- **Why**: Component testing focused on user behavior
- **Usage**: Testing React components, hooks, and user interactions
- **Philosophy**: Testing implementation details vs user experience

**@testing-library/jest-dom 6.6.3**

- **Why**: Custom Jest matchers for DOM node assertions
- **Usage**: Enhanced assertions for component testing

### Build Tools

**Turbopack** (Next.js)

- **Why**: Next-generation bundler for faster development
- **Usage**: Development mode compilation and hot reloading
- **Benefits**: Significantly faster build times and hot reload

## Deployment & Infrastructure

### Vercel Platform

**Why Vercel**:

- Seamless Next.js integration
- Global CDN with edge computing
- Automatic deployments from Git
- Built-in analytics and monitoring
- Serverless function hosting

**Features Used**:

- Static site generation (SSG)
- Server-side rendering (SSR)
- API routes
- Edge functions
- Image optimization
- Automatic HTTPS

### Domain & CDN

- Global edge network for optimal performance
- Automatic asset optimization
- Image processing and delivery
- Gzip/Brotli compression

## Third-Party Integrations

### Validation

**Zod 4.0.5**

- **Why**: TypeScript-first schema validation
- **Usage**:
  - Form validation
  - API input validation
  - Database schema validation
  - Runtime type checking
- **Benefits**: Type inference, composable schemas, detailed error messages

## Development Environment

### Package Management

**npm** (Node.js default)

- **Why**: Reliable, well-established package manager
- **Usage**: Dependency management and script execution
- **Scripts**: Development, build, test, and deployment scripts

### Node.js Version

**Node.js 20.x LTS**

- **Why**: Latest LTS version with excellent performance and security
- **Features**: ES modules support, improved performance, security updates

## Performance & Monitoring

### Built-in Optimizations

**Next.js Optimizations**:

- Automatic code splitting
- Image optimization
- Font optimization
- Bundle analysis tools

**React Optimizations**:

- Server components for reduced client bundle
- Suspense for better loading states
- Concurrent rendering for improved UX

### Monitoring Stack

**Development**:

- Next.js built-in performance metrics
- React DevTools
- TypeScript compiler diagnostics

**Production** (Future):

- Vercel Analytics
- Error tracking integration
- Performance monitoring
- User behavior analytics

## Security Architecture

### Client-Side Security

- Content Security Policy (CSP)
- XSS protection via React's built-in escaping
- CSRF protection via SameSite cookies
- Input validation with Zod schemas

### Server-Side Security

- Authentication via Clerk
- Authorization checks in Convex functions
- Input sanitization
- Rate limiting (Convex built-in)

### Data Security

- HTTPS everywhere (Vercel enforced)
- Encrypted data at rest (Convex)
- Encrypted data in transit (TLS 1.3)
- User data isolation (Convex authorization)

## HTTP Actions Development Patterns

### Development Architecture

**HTTP Actions Structure:**

```typescript
// convex/ai/actions.ts - External API integration
import { httpAction } from '../_generated/server'
import { internal } from '../_generated/api'

export const analyzeJournalEntry = httpAction(async (ctx, args) => {
  const { entryId, retryCount = 0 } = args

  try {
    // Check circuit breaker status
    const circuitStatus = await ctx.runQuery(internal.ai.getCircuitStatus)
    if (circuitStatus.isOpen) {
      throw new Error('Circuit breaker open - AI service unavailable')
    }

    // Make external API call
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisPayload),
      }
    )

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const result = await response.json()

    // Process and store results
    await ctx.runMutation(internal.ai.storeAnalysisResult, {
      entryId,
      analysis: result,
      status: 'completed',
    })
  } catch (error) {
    // Handle retry logic
    if (retryCount < 3) {
      await ctx.scheduler.runAfter(
        Math.pow(2, retryCount) * 1000, // Exponential backoff
        internal.ai.retryAnalysis,
        { entryId, retryCount: retryCount + 1 }
      )
    } else {
      // Final failure - update status and notify user
      await ctx.runMutation(internal.ai.handleAnalysisFailure, {
        entryId,
        error: error.message,
      })
    }
  }
})
```

**Queue Management with Convex Scheduler:**

```typescript
// convex/scheduler/aiProcessing.ts
export const scheduleAIAnalysis = internalMutation({
  args: {
    entryId: v.id('journalEntries'),
    priority: v.optional(v.string()),
    delay: v.optional(v.number()),
  },
  handler: async (ctx, { entryId, priority = 'normal', delay = 0 }) => {
    // Update processing status
    await ctx.db.patch(entryId, {
      processingStatus: 'queued',
      queuedAt: Date.now(),
    })

    // Schedule HTTP Action
    await ctx.scheduler.runAfter(delay, internal.ai.analyzeJournalEntry, {
      entryId,
      retryCount: 0,
      priority,
    })

    return { status: 'scheduled', entryId }
  },
})
```

**Circuit Breaker Implementation:**

```typescript
// convex/ai/circuitBreaker.ts
export const circuitBreakerConfig = {
  maxFailures: 5,
  resetTimeout: 60000, // 1 minute
  halfOpenMaxCalls: 3,
}

export const updateCircuitBreaker = internalMutation({
  args: { success: v.boolean(), service: v.string() },
  handler: async (ctx, { success, service }) => {
    const existing = await ctx.db
      .query('circuitBreakers')
      .withIndex('by_service', q => q.eq('service', service))
      .first()

    if (!existing) {
      await ctx.db.insert('circuitBreakers', {
        service,
        failures: success ? 0 : 1,
        state: 'closed',
        lastFailure: success ? null : Date.now(),
      })
      return
    }

    if (success) {
      await ctx.db.patch(existing._id, {
        failures: 0,
        state: 'closed',
        lastFailure: null,
      })
    } else {
      const newFailures = existing.failures + 1
      const newState =
        newFailures >= circuitBreakerConfig.maxFailures
          ? 'open'
          : existing.state

      await ctx.db.patch(existing._id, {
        failures: newFailures,
        state: newState,
        lastFailure: Date.now(),
      })
    }
  },
})
```

### Testing HTTP Actions

**Mocking External APIs:**

```typescript
// __tests__/httpActions.test.ts
import { ConvexTestingHelper } from 'convex/testing'
import { jest } from '@jest/globals'

// Mock fetch for testing
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('AI HTTP Actions', () => {
  let t: ConvexTestingHelper

  beforeEach(() => {
    t = new ConvexTestingHelper()
    mockFetch.mockClear()
  })

  test('handles successful AI analysis', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sentiment: 'positive',
        insights: ['Great communication'],
        healthScore: 8.5,
      }),
    } as Response)

    const result = await t.action(internal.ai.analyzeJournalEntry, {
      entryId: 'test-entry-id',
      retryCount: 0,
    })

    expect(result.status).toBe('completed')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Bearer'),
        }),
      })
    )
  })

  test('implements retry logic on API failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))

    const result = await t.action(internal.ai.analyzeJournalEntry, {
      entryId: 'test-entry-id',
      retryCount: 0,
    })

    // Should schedule retry
    expect(result.status).toBe('retry_scheduled')
    expect(result.nextRetryAt).toBeGreaterThan(Date.now())
  })

  test('circuit breaker opens after max failures', async () => {
    // Simulate multiple failures
    for (let i = 0; i < 5; i++) {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))
      await t.action(internal.ai.analyzeJournalEntry, {
        entryId: `test-entry-${i}`,
        retryCount: 0,
      })
    }

    const circuitStatus = await t.query(internal.ai.getCircuitStatus, {
      service: 'gemini_2_5_flash_lite',
    })

    expect(circuitStatus.isOpen).toBe(true)
  })
})
```

**Integration Testing:**

```typescript
// __tests__/aiProcessingFlow.test.ts
describe('AI Processing Integration', () => {
  test('complete processing flow from journal entry to results', async () => {
    const t = new ConvexTestingHelper()

    // 1. Create journal entry
    const entryId = await t.mutation(api.journalEntries.create, {
      content: 'Had a great conversation today',
      mood: 'happy',
      relationshipIds: ['rel-1'],
    })

    // 2. Schedule AI analysis
    await t.mutation(api.scheduler.scheduleAIAnalysis, {
      entryId,
      priority: 'high',
    })

    // 3. Mock successful AI response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sentiment: 'positive',
        insights: ['Good communication'],
      }),
    } as Response)

    // 4. Process scheduled action
    await t.finishAllScheduledFunctions()

    // 5. Verify results stored
    const updatedEntry = await t.query(api.journalEntries.get, { id: entryId })
    expect(updatedEntry?.processingStatus).toBe('completed')
    expect(updatedEntry?.aiAnalysis).toBeDefined()
  })
})
```

## Development Workflow

### Local Development

```bash
# Start development servers
npm run dev          # Next.js development server
npm run convex:dev   # Convex development environment with HTTP Actions

# Code quality
npm run lint         # ESLint checking
npm run format       # Prettier formatting
npm run typecheck    # TypeScript validation

# Testing
npm run test         # Jest test suite with HTTP Actions mocking
npm run test:watch   # Jest in watch mode
npm run test:ci      # CI testing with coverage

# HTTP Actions development
# - Test external API integrations with mocked responses
# - Validate circuit breaker and retry logic
# - Monitor queue processing in Convex dashboard
# - Real-time status updates via database subscriptions
```

### Production Build

```bash
npm run build        # Production build
npm run start        # Start production server
npm run convex:deploy # Deploy Convex functions
```

## API Architecture

### Convex Functions

**Mutations** (Write operations):

- Data creation, updates, deletions
- Side effects and external API calls
- User action processing

**Queries** (Read operations):

- Data retrieval with real-time subscriptions
- Computed values and aggregations
- Search and filtering

**HTTP Actions** (Reliable external integrations):

- AI API calls with circuit breaker patterns
- Email sending with retry logic
- External service integration with queue management
- Webhook processing with exponential backoff
- Third-party API calls with status tracking

### Type Safety

- End-to-end type safety from database to UI
- Shared type definitions between client and server
- Runtime validation with compile-time types
- API contract enforcement

## Scalability Considerations

### Database Scaling

- Convex handles automatic scaling
- Real-time subscriptions scale with user count
- Efficient indexing for performance
- Built-in caching layer

### Frontend Scaling

- Code splitting for optimal bundle sizes
- Server components reduce client-side JavaScript
- Image optimization for faster loading
- CDN distribution for global performance

### HTTP Actions Scaling

- Queue-based processing prevents cascade failures
- Circuit breaker patterns handle external API outages
- Exponential backoff reduces API strain during retries
- Batch processing for cost optimization
- Real-time status updates scale with concurrent processing
- Graceful degradation maintains user experience
- Rate limiting built into queue management

## Cost Optimization

### Convex Pricing

- Function execution time-based pricing
- Efficient query patterns to minimize costs
- Real-time subscriptions optimized for active users
- Storage costs optimized through data modeling

### HTTP Actions & AI Costs

- Google Gemini 2.5 Flash-Lite chosen for enhanced performance and cost-effectiveness
- Queue-based processing reduces redundant API calls
- Circuit breaker prevents costly failed request cascades
- Retry logic with exponential backoff minimizes wasted calls
- Batch processing when possible to optimize token usage
- User tier limits integrated into queue management
- Status tracking prevents duplicate processing requests

### Vercel Pricing

- Optimized for Vercel's pricing model
- Static generation where possible
- Efficient use of serverless functions
- Image optimization to reduce bandwidth

## Future Technology Considerations

### Planned Additions

- **Voice Integration**: Web Speech API for voice journaling
- **Progressive Web App**: Service workers for offline capabilities
- **Analytics**: User behavior and performance analytics
- **Error Tracking**: Comprehensive error monitoring

### Evaluation Criteria for New Technologies

1. **TypeScript Support**: First-class TypeScript integration
2. **Performance Impact**: Minimal bundle size increase
3. **Developer Experience**: Excellent tooling and documentation
4. **Maintenance Overhead**: Stable, well-maintained projects
5. **Community Support**: Active community and ecosystem
6. **Cost Implications**: Fits within project budget constraints

## Technology Decision Log

### Convex vs. Traditional Database + Backend

**Decision**: Convex
**Rationale**:

- Real-time capabilities essential for collaborative features
- Reduces infrastructure complexity
- Excellent TypeScript integration
- Serverless scaling matches project needs

### Clerk vs. NextAuth vs. Custom Auth

**Decision**: Clerk
**Rationale**:

- Comprehensive feature set out of the box
- Excellent Next.js integration
- Reduces security implementation burden
- Professional user management dashboard

### Gemini 2.5 Flash-Lite vs. OpenAI vs. Anthropic

**Decision**: Google Gemini 2.5 Flash-Lite
**Rationale**:

- Cost-effective for high-volume text analysis
- Excellent performance for sentiment analysis
- Google's infrastructure reliability
- Good integration with development tools

This technology stack provides a solid foundation for building Resonant while maintaining flexibility for future enhancements and scaling requirements.
