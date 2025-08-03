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

[... rest of the existing content remains unchanged ...]

## Code Quality Checklist

- Run prettier to check code formatting
- **Always run prettier before committing code**

[... rest of the existing content remains unchanged ...]
