# Resonant - Relationship Health Journal

A modern web application for tracking and improving relationship wellness through journaling, mood tracking, and AI-powered insights.


## 🌟 Overview

Resonant helps users build stronger, more meaningful connections by providing tools to:

- Journal about relationships with rich content and mood tracking
- Track relationship health over time
- Get AI-powered insights with structured emotional analysis through LangExtract integration
- Maintain privacy with secure, personal data

## 🚀 Tech Stack

### Frontend

- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **Clerk** for authentication

### Backend

- **Convex** for real-time database and serverless functions
- **LangExtract** for structured emotional and thematic analysis of journal entries
- **Zod** for type-safe validation schemas
- **TypeScript** throughout for type safety

### Testing

- **Jest** with React Testing Library for unit/component tests
- **Playwright** with MCP browser automation for E2E tests
- Comprehensive test account system with 4 user personas

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- Git

### Quick Start

1. **Clone and Install**

   ```bash
   git clone <repository-url>
   cd resonant
   npm install
   ```

2. **Environment Setup**

   ```bash
   cp .env.local.template .env.local
   # Configure your environment variables
   ```

3. **Start Development Servers**

   ```bash
   # Terminal 1: Next.js development server
   npm run dev

   # Terminal 2: Convex backend
   npm run convex:dev
   ```

4. **Open Application**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Convex dashboard available during development

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── journal/           # Journal entry management
│   ├── relationships/     # Relationship management
│   └── dashboard/         # Main dashboard
├── components/
│   ├── features/          # Feature-specific components
│   │   ├── journal/       # Journal entry components
│   │   └── relationships/ # Relationship components
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

tests/                   # Comprehensive test suite
├── e2e/                # End-to-end tests
├── helpers/            # Test utilities
├── fixtures/           # Test data factories
└── setup/             # Global test setup
```

## 🧪 Testing

### Unit & Component Tests

```bash
npm test                # Run all Jest tests
npm test:watch         # Run tests in watch mode
npm test:ci            # Run tests with coverage for CI
```

### E2E Tests

```bash
npm run test:e2e       # Standard Playwright tests
npm run test:e2e:ui    # Playwright with UI mode
npm run test:mcp       # Playwright MCP browser automation
```

### Test User Personas

The system includes 4 test user personas:

- **New User**: Empty state for onboarding testing
- **Active User**: Moderate data for typical workflows
- **Power User**: Extensive data for performance testing
- **Edge Case User**: Boundary conditions and special characters

## 🎯 Key Features

### Journal Entry System

- Rich text content editor with validation
- Mood selector with 10 different mood options
- Dynamic tag input with suggestions
- Relationship picker with multi-select
- Privacy controls for sensitive entries
- Auto-save functionality

### Relationship Management

- Create and organize relationships by type
- Track relationship health over time
- Visual relationship status indicators
- Relationship-specific journal filtering

### Dashboard & Analytics

- Relationship health summaries
- Journal entry statistics
- Mood tracking over time
- AI-powered insights with structured emotional analysis
- LangExtract integration for emotional, thematic, and relationship pattern recognition
- Enhanced dashboard visualizations with color-coded emotional insights

### 🧠 LangExtract AI Integration

Resonant now features advanced emotional and thematic analysis powered by LangExtract:

#### Structured Emotional Analysis

- **Emotion Detection**: Identifies and categorizes emotions with intensity levels
- **Theme Recognition**: Extracts key relationship themes (communication, quality time, support, etc.)
- **Trigger Identification**: Recognizes emotional triggers with severity assessment
- **Communication Patterns**: Analyzes conversation styles and tones
- **Relationship Dynamics**: Identifies positive/negative interaction patterns

#### Enhanced Insights Dashboard

- **Color-Coded Badges**: Visual representation of emotions, themes, and triggers
- **Intensity Indicators**: Visual markers showing emotional intensity (●●● for high, ●○○ for low)
- **Processing Metrics**: Real-time performance monitoring and success rates
- **Fallback Protection**: Graceful degradation with standard analysis when needed

#### Feature Management

- **Feature Flag Control**: Safe deployment with gradual rollout capabilities
- **Performance Monitoring**: Comprehensive metrics collection and alerting
- **Error Handling**: Robust error handling with automatic fallback to standard analysis
- **Backward Compatibility**: Seamless integration with existing functionality

## 🔧 Available Scripts

### Development

```bash
npm run dev          # Start Next.js dev server
npm run convex:dev   # Start Convex backend
npm run build        # Production build
npm run start        # Production server
```

### Code Quality

```bash
npm run lint         # ESLint checking
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Prettier formatting
npm run typecheck    # TypeScript validation
```

### Testing

```bash
npm test             # Unit tests
npm run test:e2e     # E2E tests
npm run test:mcp     # MCP browser automation tests
```

### Database

```bash
npm run convex:deploy  # Deploy Convex functions
```

## 🔐 Authentication

- Powered by **Clerk** with development and production configurations
- Social login support (Google)
- Email/password authentication
- Secure middleware protection for all app routes
- Public routes: `/`, `/sign-in/*`, `/sign-up/*`

## 📊 Database Schema

### Core Tables

- **users**: User profiles with Clerk integration
- **relationships**: User's relationship definitions and types
- **journalEntries**: Journal content with mood, tags, and relationships
- **healthScores**: AI-calculated relationship health metrics with LangExtract structured insights
- **langExtractMetrics**: Performance monitoring for LangExtract processing
- **langExtractAggregateMetrics**: Aggregated performance statistics for monitoring

## 🚢 Deployment

### Vercel (Recommended)

```bash
npm run build
# Deploy to Vercel
```

### Environment Variables

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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm test` and `npm run test:e2e`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode (no `any` types)
- Write comprehensive tests for new features
- Use absolute imports with `@/` path mapping
- Follow existing component and naming patterns
- Ensure all tests pass before submitting PRs

## 📚 Documentation

- **Architecture**: See `docs/architecture/` for technical design
- **User Stories**: See `docs/stories/` for feature specifications
- **API Documentation**: Available in Convex dashboard during development
- **Testing Guide**: See `tests/README-MCP-Integration.md`

## 🐛 Troubleshooting

### Common Issues

**Development servers not connecting:**

- Ensure both `npm run dev` and `npm run convex:dev` are running
- Check environment variables are properly configured

**Authentication issues:**

- Verify Clerk keys in `.env.local`
- Check that middleware is properly configured

**Test failures:**

- Run `npm run typecheck` to identify TypeScript issues
- Ensure test database is properly seeded

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [Convex](https://convex.dev/)
- Authentication by [Clerk](https://clerk.com/)
- Testing with [Playwright](https://playwright.dev/) and [Jest](https://jestjs.io/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

---

**Resonant** - Building stronger relationships through mindful journaling and insights.
