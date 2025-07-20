# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Resonant is a relationship health journal application built with Next.js 15, React 19, TypeScript, and real-time Convex backend. The app enables users to track relationship wellness through journaling, mood tracking, and AI-powered insights.

## Core Development Commands

### Development Setup

```bash
# Start both development servers (required for full functionality)
npm run dev          # Next.js development server (localhost:3000)
npm run convex:dev   # Convex backend development environment

# Environment setup
cp .env.local.template .env.local  # Copy and configure environment variables
```

### Code Quality & Testing

```bash
# Testing commands
npm test                # Run all Jest tests
npm test:watch         # Run tests in watch mode
npm test:ci            # Run tests with coverage for CI
npm test -- --testPathPatterns="component-name"  # Run specific test file

# Code quality
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
- **E2E Tests**: Use Playwright MCP for authentication and user flow testing
- **Test Pattern**: `ComponentName.test.tsx` for components, `fileName.test.ts` for utilities

## Architecture Overview

### Technology Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS
- **Backend**: Convex (real-time database + serverless functions)
- **Authentication**: Clerk with Next.js integration
- **Testing**: Jest + React Testing Library + Playwright MCP
- **Validation**: Zod schemas for type-safe form and API validation

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes (sign-in, sign-up)
│   ├── journal/           # Journal entry pages and [id] routes
│   ├── relationships/     # Relationship management
│   └── dashboard/         # Main dashboard
├── components/
│   ├── features/          # Feature-specific components
│   │   ├── journal/       # Journal entry components + tests
│   │   └── relationships/ # Relationship components + tests
│   ├── ui/               # Reusable UI components
│   └── providers/        # React context providers
├── hooks/                # Custom React hooks
├── lib/                  # Shared utilities and types
└── middleware.ts         # Clerk authentication middleware

convex/                   # Backend functions and schema
├── schema.ts            # Database schema definitions
├── journalEntries.ts    # Journal CRUD operations
├── relationships.ts     # Relationship CRUD operations
└── users.ts            # User management functions
```

### Database Schema (Convex)

- **users**: User profiles with Clerk integration
- **relationships**: User's relationship definitions
- **journalEntries**: Journal content with mood/tags/relationships
- **healthScores**: AI-calculated relationship health metrics

### Key Components Architecture

#### Journal System

- **journal-entry-editor**: Main form for creating/editing entries
- **mood-selector**: 10 mood types with emoji interface
- **tag-input**: Dynamic tag system with suggestions and autocomplete
- **relationship-picker**: Multi-select component with photo/initial display
- **journal-entry-card**: Display component for entry lists

#### Authentication Flow

- Clerk handles all authentication with middleware protection
- Public routes: `/`, `/sign-in/*`, `/sign-up/*`
- Protected routes: All others require authentication
- User sync: Automatic Convex user creation via Clerk webhooks

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

# AI Features (Future)
GOOGLE_GEMINI_API_KEY=              # For AI analysis features
```

### Development Dependencies

- Both `npm run dev` and `npm run convex:dev` must be running simultaneously
- Clerk development keys work in development mode
- Real-time updates require active Convex connection

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

## Playwright MCP Testing

For end-to-end testing with authentication:

- Use Playwright MCP tools for browser automation
- Authentication requires real email verification in development
- Test authentication flows and component interactions
- Focus on critical user journeys and form validations

## Code Quality Standards

- **TypeScript**: Strict mode enabled, no `any` types
- **Testing**: Comprehensive test coverage for all features
- **Formatting**: Prettier with ESLint integration
- **Components**: Functional components with TypeScript
- **Imports**: Absolute imports using `@/` path mapping
- **Validation**: Zod schemas for all form and API validation
