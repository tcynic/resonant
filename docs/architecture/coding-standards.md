# Coding Standards - Resonant Relationship Health Journal

## Overview

This document defines the coding standards, conventions, and best practices for the Resonant project. These standards ensure consistency, maintainability, and quality across the codebase.

## Technology Stack Standards

### TypeScript

- **Strict Mode**: Always use TypeScript strict mode
- **Type Definitions**: All functions, variables, and props must have explicit types
- **No `any`**: Avoid `any` type - use proper typing or `unknown` if necessary
- **Interface vs Type**: Use `interface` for object shapes, `type` for unions and primitives

```typescript
// ✅ Good
interface User {
  id: string
  name: string
  email: string
}

// ✅ Good
type Status = 'pending' | 'completed' | 'failed'

// ❌ Bad
const user: any = { id: 1, name: 'John' }
```

### React/Next.js Standards

#### Component Structure

```typescript
// ✅ Preferred component structure
interface ComponentProps {
  title: string
  onClick?: () => void
}

export default function Component({ title, onClick }: ComponentProps) {
  // Hooks first
  const [state, setState] = useState<string>('')
  const router = useRouter()

  // Event handlers
  const handleClick = () => {
    onClick?.()
  }

  // Early returns
  if (!title) return null

  // Render
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={handleClick}>Click me</button>
    </div>
  )
}
```

#### Hooks Guidelines

- Use custom hooks for complex logic
- Follow React hooks rules strictly
- Name custom hooks with `use` prefix
- Keep hooks focused and single-purpose

#### Server Components vs Client Components

- Default to Server Components when possible
- Use `'use client'` only when necessary (state, events, browser APIs)
- Mark client components explicitly at the top of the file

### Convex Standards

#### Database Operations

```typescript
// ✅ Good - with proper validation
export const createUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate inputs
    validateUserInput(args)

    // Check authorization
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new ConvexError('Unauthorized')

    // Business logic
    const userId = await ctx.db.insert('users', {
      ...args,
      createdAt: Date.now(),
    })

    return userId
  },
})
```

#### Query Patterns

- Use proper indexing for queries
- Implement pagination for large datasets
- Handle authorization in all operations
- Use transactions for multi-table operations

### Styling Standards

#### Tailwind CSS

- Use Tailwind utility classes primarily
- Create component classes in `globals.css` for repeated patterns
- Follow mobile-first responsive design
- Use semantic color names from design system

```typescript
// ✅ Good
<div className="flex flex-col space-y-4 p-6 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-semibold text-gray-900">Title</h2>
  <p className="text-gray-600">Description</p>
</div>

// ❌ Avoid inline styles
<div style={{ padding: '24px', backgroundColor: 'white' }}>
```

## File Organization Standards

### Naming Conventions

- **Files**: kebab-case for files (`user-profile.tsx`)
- **Components**: PascalCase for React components (`UserProfile.tsx`)
- **Variables/Functions**: camelCase (`userName`, `getUserData`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`)
- **Types/Interfaces**: PascalCase (`User`, `CreateUserData`)

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Route groups
│   ├── dashboard/         # Feature-based pages
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   ├── features/         # Feature-specific components
│   └── layout/           # Layout components
├── lib/                  # Utilities and configurations
│   ├── utils.ts          # General utilities
│   ├── types.ts          # Type definitions
│   ├── validations.ts    # Validation schemas
│   └── constants.ts      # App constants
├── hooks/                # Custom React hooks
└── styles/               # Additional styles
```

### Import Organization

```typescript
// 1. Node modules
import React from 'react'
import { NextPage } from 'next'

// 2. Internal imports (absolute paths)
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { User } from '@/lib/types'

// 3. Relative imports
import './component.css'
```

## Code Quality Standards

### ESLint Configuration

- Extend Next.js ESLint config
- Use Prettier for formatting
- Enforce TypeScript strict rules
- No unused variables or imports

### Testing Standards

#### Unit Tests

```typescript
// ✅ Good test structure
describe('UserProfile', () => {
  it('should display user name when provided', () => {
    const user = { id: '1', name: 'John Doe', email: 'john@example.com' }

    render(<UserProfile user={user} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('should handle missing user gracefully', () => {
    render(<UserProfile user={null} />)

    expect(screen.getByText('No user data')).toBeInTheDocument()
  })
})
```

#### Test File Location

- Place test files adjacent to source files
- Use `.test.tsx` or `.test.ts` extensions
- Create `__tests__` folders for multiple test files

### Error Handling

#### Frontend Error Handling

```typescript
// ✅ Good error handling
try {
  const data = await fetchUserData(userId)
  setUser(data)
} catch (error) {
  console.error('Failed to fetch user:', error)
  toast.error('Unable to load user data. Please try again.')
}
```

#### Backend Error Handling

```typescript
// ✅ Good Convex error handling
export const getUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)

    if (!user) {
      throw new ConvexError('User not found')
    }

    return user
  },
})
```

## Performance Standards

### Code Splitting

- Use dynamic imports for large components
- Implement route-based code splitting
- Lazy load non-critical components

### Image Optimization

- Use Next.js `Image` component
- Provide appropriate `alt` attributes
- Use proper image formats (WebP when possible)

### Bundle Optimization

- Analyze bundle size regularly
- Tree-shake unused dependencies
- Use production builds for performance testing

## Security Standards

### Input Validation

- Validate all user inputs on both client and server
- Use Zod for runtime validation
- Sanitize data before database operations

### Authentication

- Use Clerk for authentication
- Verify user identity in all protected operations
- Implement proper session management

### Data Protection

- Never expose sensitive data in client-side code
- Use environment variables for secrets
- Implement proper CORS settings

## Documentation Standards

### Code Comments

- Write self-documenting code when possible
- Use JSDoc for complex functions
- Explain business logic, not obvious code

```typescript
/**
 * Calculates relationship health score based on journal entries
 * @param entries - Array of journal entries for the relationship
 * @param timeframe - Number of days to consider (default: 30)
 * @returns Health score between 0-100
 */
function calculateHealthScore(entries: JournalEntry[], timeframe = 30): number {
  // Implementation...
}
```

### README Files

- Include setup instructions
- Document environment variables
- Provide usage examples

## Git Standards

### Commit Messages

Follow conventional commits format:

```
type(scope): description

feat(auth): add user profile management
fix(ui): resolve button alignment issue
docs(readme): update setup instructions
```

### Branch Naming

- `feature/story-number-description`
- `fix/bug-description`
- `chore/maintenance-task`

### Pull Request Standards

- Provide clear description of changes
- Include testing instructions
- Reference related issues/stories
- Ensure all checks pass

## Accessibility Standards

### WCAG Guidelines

- Follow WCAG 2.1 AA standards
- Provide proper ARIA labels
- Ensure keyboard navigation
- Maintain color contrast ratios

### Testing

- Use screen readers for testing
- Validate with accessibility tools
- Test keyboard-only navigation

## Linting and Formatting

### Prettier Configuration

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80
}
```

### ESLint Rules

- Enforce consistent code style
- Prevent common errors
- Maintain TypeScript strict mode
- Use React hooks rules

## Environment-Specific Standards

### Development

- Use hot reloading for rapid development
- Enable verbose logging
- Use development-specific configurations

### Production

- Minimize bundle size
- Enable error tracking
- Use production optimizations
- Implement proper caching strategies

## Review Process

### Code Review Checklist

- [ ] Code follows established patterns
- [ ] Tests are included and pass
- [ ] Documentation is updated
- [ ] Performance implications considered
- [ ] Security vulnerabilities addressed
- [ ] Accessibility requirements met

### Definition of Done

- All tests pass
- Code review approved
- Documentation updated
- No linting errors
- Accessibility validated
- Performance benchmarks met
