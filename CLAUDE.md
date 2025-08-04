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

### Deployment Procedures

- **Feature Flag Documentation**: `docs/procedures/langextract-feature-flag-management.md`
- **Deployment & Rollback**: `docs/procedures/langextract-deployment-rollback.md`
- **Epic & Stories**: `docs/stories/epic-langextract-integration.md`

[... rest of the existing content remains unchanged ...]

## Code Quality Checklist

- Run prettier to check code formatting
- **Always run prettier before committing code**

[... rest of the existing content remains unchanged ...]
