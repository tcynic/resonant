# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Resonant is a relationship health journal application built with Next.js 15, React 19, TypeScript, and real-time Convex backend. The app enables users to track relationship wellness through journaling, mood tracking, and AI-powered insights with LangExtract integration for structured emotional and thematic analysis.

## Core Development Commands

### Development Setup

```bash
# CRITICAL: Both development servers MUST run simultaneously for full functionality
npm run dev          # Terminal 1: Next.js with Turbopack (localhost:3000)
npm run convex:dev   # Terminal 2: Convex real-time backend + dashboard

# Environment setup
cp .env.local.template .env.local  # Copy and configure environment variables
```

### Claude Code CLI Slash Commands

```bash
# Quick development workflow
npm run push              # /push command: format, commit, and push code with auto-generated commit message

# Usage: Simply run `npm run push` or `./scripts/push-command.sh` to:
# 1. Run prettier to format code
# 2. Generate intelligent commit message based on changed files
# 3. Stage all changes and commit
# 4. Push to remote repository
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

# LangExtract Integration Validation
./scripts/validate-langextract-integration.sh  # Comprehensive integration validation
```

## Architecture Overview

### Tech Stack

- **Frontend**: Next.js 15 with App Router, React 19, TypeScript, Tailwind CSS 4
- **Backend**: Convex real-time database with serverless functions
- **Authentication**: Clerk with middleware protection
- **AI Integration**: Google Gemini 2.5 Flash-Lite + LangExtract preprocessing
- **Testing**: Jest + React Testing Library (unit), Playwright (E2E)

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── journal/           # Journal entry management
│   ├── relationships/     # Relationship management
│   └── dashboard/         # Main dashboard
├── components/
│   ├── features/          # Feature-specific components
│   ├── layout/           # App shell and navigation
│   ├── ui/               # Reusable UI components
│   └── providers/        # React context providers
├── hooks/                # Custom React hooks
└── lib/                  # Shared utilities and types

convex/                   # Backend functions and schema
├── schema.ts            # Database schema definitions
├── utils/ai_bridge.ts   # LangExtract integration
├── monitoring/          # Performance monitoring
└── migrations/          # Database migrations
```

### Key Components

- **App Shell**: `src/components/layout/AppShell.tsx` - Main layout with navigation
- **Navigation**: `src/components/layout/NavigationProvider.tsx` - Navigation state management
- **AI Bridge**: `convex/utils/ai_bridge.ts` - LangExtract preprocessing and AI analysis
- **Database Schema**: `convex/schema.ts` - Comprehensive schema with LangExtract support

## LangExtract Integration

### Key Components

- **Core Integration**: `convex/utils/ai_bridge.ts` - LangExtract preprocessing function
- **Database Schema**: Enhanced with `langExtractMetrics` and `langExtractAggregateMetrics` tables
- **UI Components**: `src/components/features/dashboard/structured-insights.tsx`
- **Monitoring**: `convex/monitoring/langextract-metrics.ts`
- **E2E Tests**: `tests/e2e/langextract-integration.spec.ts`

### Feature Flag Management

```bash
# Environment variables for LangExtract control
LANGEXTRACT_ENABLED=true|false
LANGEXTRACT_TIMEOUT_MS=5000
LANGEXTRACT_MAX_RETRIES=2
LANGEXTRACT_FALLBACK_ENABLED=true
```

### Validation and Testing

```bash
# LangExtract-specific testing
npm run validate:langextract    # Full integration validation
npm run langextract:e2e        # E2E tests for LangExtract features
./scripts/validate-langextract-integration.sh  # Comprehensive validation script
```

## Database Schema

### Core Tables

- **users**: User profiles with Clerk integration, preferences, and subscription tiers
- **relationships**: User's relationship definitions with types and metadata
- **journalEntries**: Journal content with mood, tags, relationships, and AI analysis
- **healthScores**: AI-calculated relationship health metrics
- **langExtractMetrics**: Performance monitoring for LangExtract processing
- **langExtractAggregateMetrics**: Aggregated performance statistics

### Migration System

- Database migrations located in `convex/migrations/`
- Use `convex/migrations/legacy_cleanup_v7.ts` for schema updates
- Enhanced AI analysis metadata in `001_enhance_aianalysis_metadata.ts`

## Testing Architecture

### Test Account System

Four comprehensive test user personas:

- **New User**: Empty state for onboarding testing
- **Active User**: Moderate data for typical workflows
- **Power User**: Extensive data for performance testing
- **Edge Case User**: Boundary conditions and special characters

### Test Structure

```
tests/
├── e2e/                    # Playwright E2E tests
│   ├── auth/              # Authentication flows
│   ├── user-journeys/     # Core user workflows
│   └── advanced-features/ # Complex feature testing
├── helpers/               # Test utilities and client setup
├── fixtures/              # Test data factories
└── accounts/              # Test user persona definitions
```

### Running Specific Tests

```bash
# Run tests for specific features
npm test -- --testPathPatterns="journal"
npm test -- --testPathPatterns="structured-insights"

# E2E test categories
npm run test:ci:auth       # Authentication flows
npm run test:ci:journeys   # User journey tests
npm run test:ci:advanced   # Advanced feature tests
```

## Development Workflow

### Feature Development

1. **Code Quality**: Always run `npm run format` before committing
2. **Type Safety**: Run `npm run typecheck` to validate TypeScript
3. **Testing**: Ensure unit tests pass with `npm test:ci`
4. **E2E Validation**: Run relevant E2E tests for modified features

### Deployment Pipeline

```bash
# Staging deployment
npm run deploy:staging      # Code quality + tests + Convex deploy + Vercel preview

# Production deployment
npm run deploy:production   # Full validation + deploy + health check

# Health monitoring
npm run deploy:health-check # Post-deployment validation
```

### Monitoring and Debugging

- **Circuit Breaker Dashboard**: `src/components/features/admin/circuit-breaker-dashboard.tsx`
- **Performance Monitoring**: `convex/monitoring/` with comprehensive metrics
- **Error Handling**: `convex/utils/error_logger.ts` for centralized logging
- **Service Recovery**: `convex/service_recovery.ts` for failure handling

## Code Quality Standards

- **TypeScript**: Strict mode enabled, no `any` types allowed
- **ESLint**: Next.js config with Prettier integration
- **Testing**: Comprehensive unit and E2E test coverage required
- **Imports**: Use absolute imports with `@/` path mapping
- **Formatting**: Prettier must be run before all commits

## AI Processing Pipeline

### Architecture

- **HTTP Actions**: `convex/ai_processing.ts` for AI analysis processing
- **Queue System**: `convex/scheduler/analysis_queue.ts` for background processing
- **Circuit Breaker**: `convex/utils/circuit_breaker.ts` for failure handling
- **Fallback System**: `convex/fallback/` for degraded service scenarios

### LangExtract Integration

- **Preprocessing**: Text analysis with structured data extraction
- **Feature Flags**: Environment-controlled rollout with fallback protection
- **Performance Monitoring**: Real-time metrics and alerting
- **Error Recovery**: Automatic fallback to standard analysis on failures

## Environment Configuration

### Required Environment Variables

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# AI Features
GOOGLE_GEMINI_API_KEY=

# LangExtract Integration
LANGEXTRACT_ENABLED=true
LANGEXTRACT_TIMEOUT_MS=5000
LANGEXTRACT_MAX_RETRIES=2
LANGEXTRACT_FALLBACK_ENABLED=true
```
