# Production Deployment Guide

Comprehensive guide for deploying the Resonant application to production environments.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Convex Backend Deployment](#convex-backend-deployment)
4. [Vercel Frontend Deployment](#vercel-frontend-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Performance Optimization](#performance-optimization)

## Pre-Deployment Checklist

### Code Quality Verification

```bash
# 1. Run comprehensive quality checks
npm run check                    # ESLint + TypeScript + Prettier
npm run test:ci                  # Unit and integration tests
npm run test:ci:auth            # Authentication flow tests
npm run test:ci:journeys        # User journey tests

# 2. Validate test environment
npm run test:accounts:validate   # Verify test user accounts
npm run test:setup:validate     # Validate test environment setup

# 3. Performance validation
npm run test:performance        # Performance benchmarks
```

### Environment Variable Validation

```bash
# Verify all required environment variables are set
node -e "
const required = [
  'NEXT_PUBLIC_CONVEX_URL',
  'CONVEX_DEPLOY_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'CLERK_WEBHOOK_SECRET',
  'GOOGLE_GEMINI_API_KEY'
];

required.forEach(env => {
  if (!process.env[env]) {
    console.error('❌ Missing:', env);
    process.exit(1);
  } else {
    console.log('✅ Found:', env);
  }
});
console.log('All environment variables validated');
"
```

### Database Schema Validation

```bash
# Verify schema compatibility
npx convex schema

# Check for breaking changes
npx convex schema --diff

# Validate data integrity (if applicable)
npx convex run debug:validateSchema
```

## Environment Setup

### Production Environment Variables

#### Vercel Environment Variables

Set these in the Vercel dashboard under Settings > Environment Variables:

```bash
# Required for Production
NEXT_PUBLIC_CONVEX_URL=https://your-prod-deployment.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
GOOGLE_GEMINI_API_KEY=your-production-api-key

# Optional Production Settings
NODE_ENV=production
VERCEL_ENV=production
SENTRY_DSN=https://your-sentry-dsn  # If using Sentry
```

#### Convex Environment Variables

```bash
# Set production environment variables in Convex
npx convex env set GOOGLE_GEMINI_API_KEY your-production-api-key
npx convex env set CLERK_WEBHOOK_SECRET whsec_your-production-secret

# Verify settings
npx convex env list
```

### SSL/TLS Configuration

#### Custom Domain Setup (Optional)

```bash
# Add custom domain in Vercel dashboard
# 1. Go to Project Settings > Domains
# 2. Add your domain (e.g., app.yourdomain.com)
# 3. Configure DNS records as shown
# 4. Verify SSL certificate generation

# Test SSL configuration
curl -I https://your-custom-domain.com
openssl s_client -connect your-custom-domain.com:443 -servername your-custom-domain.com
```

## Convex Backend Deployment

### Step 1: Prepare Convex Deployment

```bash
# Set production deployment key
export CONVEX_DEPLOY_KEY=your-production-deploy-key

# Verify deployment target
npx convex env list --preview-name production

# Check current deployment status
npx convex status
```

### Step 2: Deploy Backend Functions

```bash
# Deploy with integrated frontend build
npx convex deploy --cmd 'npm run build'

# Alternative: Deploy backend only
npx convex deploy

# Monitor deployment progress
npx convex logs --tail
```

### Step 3: Verify Backend Deployment

```bash
# Check function deployment status
npx convex dashboard

# Test critical functions
npx convex run users:list
npx convex run journalEntries:getHealthCheck

# Verify database indexes
npx convex run debug:listIndexes
```

### Production Function Configuration

#### Database Indexes

Ensure optimal performance with proper indexing:

```typescript
// convex/schema.ts - Production indexes
export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    createdAt: v.number(),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_created', ['createdAt']),

  journalEntries: defineTable({
    userId: v.id('users'),
    content: v.string(),
    mood: v.number(),
    createdAt: v.number(),
    relationshipIds: v.array(v.id('relationships')),
  })
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_mood_created', ['mood', 'createdAt'])
    .index('by_created', ['createdAt']),

  relationships: defineTable({
    userId: v.id('users'),
    name: v.string(),
    type: v.string(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_type', ['userId', 'type']),
})
```

#### Rate Limiting Configuration

```typescript
// convex/rateLimit.ts
import { defineRateLimits } from 'convex/server'

export default defineRateLimits({
  // AI analysis - limit expensive operations
  aiAnalysis: {
    kind: 'fixed window',
    period: '1h',
    max: 100, // 100 requests per hour per user
  },

  // Journal creation - prevent spam
  journalCreation: {
    kind: 'fixed window',
    period: '1m',
    max: 10, // 10 entries per minute
  },

  // Search queries
  search: {
    kind: 'sliding window',
    period: '1m',
    max: 60, // 1 search per second
  },
})
```

## Vercel Frontend Deployment

### Step 1: Configure Vercel Project

```bash
# Initialize Vercel project (if not already done)
vercel

# Configure project settings
vercel env pull .env.local.production
```

### Step 2: Production Build Testing

```bash
# Test production build locally
npm run build
npm run start

# Verify build output
ls -la .next/

# Test critical pages
curl http://localhost:3000
curl http://localhost:3000/api/health
```

### Step 3: Deploy to Production

```bash
# Deploy to production
vercel --prod

# Monitor deployment
vercel logs

# Verify deployment
vercel ls
```

### Vercel Configuration

#### next.config.ts for Production

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Production optimizations
  compress: true,
  generateEtags: true,

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ]
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Bundle analysis (development only)
  ...(process.env.ANALYZE === 'true' && {
    bundleAnalyzer: {
      enabled: true,
    },
  }),
}

export default nextConfig
```

#### vercel.json Configuration

```json
{
  "version": 2,
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "devCommand": "npm run dev",
  "regions": ["iad1"],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/webhooks/clerk",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://api.clerk.dev"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "POST"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/home",
      "destination": "/dashboard",
      "permanent": true
    }
  ]
}
```

## Post-Deployment Verification

### Health Check Suite

```bash
# 1. Basic connectivity tests
curl -f https://your-domain.com || echo "❌ Homepage failed"
curl -f https://your-domain.com/api/health || echo "❌ API health failed"

# 2. Authentication flow test
npm run test:ci:auth

# 3. Critical user journeys
npm run test:ci:journeys

# 4. Performance benchmarks
npm run test:performance

# 5. Generate comprehensive report
npm run test:report:generate
```

### Manual Verification Checklist

#### Frontend Verification

- [ ] Homepage loads correctly
- [ ] User can sign up/sign in
- [ ] Dashboard displays correctly
- [ ] Journal entry creation works
- [ ] Relationship management works
- [ ] Search functionality works
- [ ] Mobile responsiveness
- [ ] Error boundaries work

#### Backend Verification

- [ ] Real-time updates work
- [ ] Database queries perform well
- [ ] AI analysis functions
- [ ] Webhook endpoints respond
- [ ] Rate limiting active
- [ ] Data validation working

#### Integration Verification

- [ ] Clerk authentication works
- [ ] Convex real-time sync works
- [ ] AI analysis completes
- [ ] Email notifications sent
- [ ] Data export functions

### Performance Verification

```bash
# Lighthouse CI (if configured)
npx lhci autorun

# Core Web Vitals check
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://your-domain.com&strategy=mobile" | \
  jq '.lighthouseResult.audits["largest-contentful-paint"].displayValue'

# Custom performance tests
npm run test:performance
```

## Rollback Procedures

### Quick Rollback

```bash
# 1. Identify last known good deployment
vercel ls

# 2. Rollback Vercel deployment
vercel rollback https://your-app-hash.vercel.app

# 3. If needed, rollback Convex deployment
# (Convex doesn't support direct rollback, requires redeployment)
git checkout last-known-good-commit
npx convex deploy
```

### Emergency Rollback

```bash
#!/bin/bash
# emergency-rollback.sh

set -e

echo "🚨 Emergency rollback initiated"

# Get last stable deployment
LAST_STABLE=$(vercel ls --json | jq -r '.[1].url')

echo "Rolling back to: $LAST_STABLE"

# Rollback Vercel
vercel rollback $LAST_STABLE

# Verify rollback
curl -f https://your-domain.com || {
  echo "❌ Rollback failed"
  exit 1
}

echo "✅ Rollback successful"

# Notify team (integrate with Slack/Discord)
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚨 Production rollback completed"}' \
  $SLACK_WEBHOOK_URL
```

### Data Rollback (If Needed)

```bash
# Only if database changes need rollback
# 1. Export current state (backup)
npx convex export --path rollback-backup-$(date +%s)

# 2. Import previous backup
npx convex import --replace backup-before-deployment.zip

# 3. Verify data integrity
npx convex run debug:validateData
```

## Performance Optimization

### Frontend Optimizations

#### Bundle Size Optimization

```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer

# Common optimizations:
# 1. Dynamic imports for large components
# 2. Remove unused dependencies
# 3. Use tree-shaking
# 4. Optimize images
```

#### Code Splitting Example

```typescript
// Dynamic import for large components
import dynamic from 'next/dynamic'

const AdvancedAnalytics = dynamic(
  () => import('../components/features/insights/advanced-analytics'),
  {
    loading: () => <div>Loading analytics...</div>,
    ssr: false,
  }
)
```

### Backend Optimizations

#### Database Query Optimization

```typescript
// Optimized query patterns
export const getRecentEntriesOptimized = query({
  args: {
    userId: v.id('users'),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 10, 50) // Cap at 50

    let query = ctx.db
      .query('journalEntries')
      .withIndex('by_user_created', q => q.eq('userId', args.userId))
      .order('desc')

    if (args.cursor) {
      query = query.filter(q =>
        q.lt(q.field('_creationTime'), parseInt(args.cursor))
      )
    }

    return await query.take(limit)
  },
})
```

#### Caching Strategy

```typescript
// Implement caching for expensive operations
export const getCachedAnalytics = query({
  args: { userId: v.id('users'), timeRange: v.string() },
  handler: async (ctx, args) => {
    // Check cache first
    const cacheKey = `analytics_${args.userId}_${args.timeRange}`
    const cached = await ctx.db
      .query('cache')
      .withIndex('by_key', q => q.eq('key', cacheKey))
      .first()

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }

    // Compute analytics
    const analytics = await computeAnalytics(ctx, args)

    // Cache result
    await ctx.db.insert('cache', {
      key: cacheKey,
      data: analytics,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    })

    return analytics
  },
})
```

### CDN and Edge Optimization

#### Image Optimization

```typescript
// next.config.ts
export default {
  images: {
    domains: ['your-cdn-domain.com'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
}
```

#### Edge Functions

```typescript
// middleware.ts - Edge runtime
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Add security headers at the edge
  const response = NextResponse.next()

  response.headers.set('x-frame-options', 'DENY')
  response.headers.set('x-content-type-options', 'nosniff')

  return response
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
  runtime: 'edge',
}
```

## Security Considerations

### Production Security Checklist

- [ ] All environment variables secured
- [ ] Webhook signatures verified
- [ ] HTTPS enforced
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Input validation active
- [ ] SQL injection protection (N/A for Convex)
- [ ] XSS protection enabled
- [ ] CSRF protection enabled

### Security Headers

```typescript
// Security headers configuration
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' *.clerk.dev *.convex.cloud; style-src 'self' 'unsafe-inline'; img-src 'self' data: *.clerk.dev; connect-src 'self' *.clerk.dev *.convex.cloud *.google.com;",
  },
]
```

## Monitoring and Observability

### Key Metrics to Monitor

1. **Performance Metrics**
   - Page load time (< 2s)
   - API response time (< 500ms)
   - Database query time (< 100ms)
   - Real-time sync latency (< 100ms)

2. **Business Metrics**
   - User registration rate
   - Daily active users
   - Journal entries per user
   - Feature adoption rates

3. **Error Metrics**
   - Error rate (< 1%)
   - 5xx errors
   - Client-side errors
   - Failed webhooks

### Logging Strategy

```typescript
// Structured logging
import { logger } from '@/lib/logger'

export const createJournalEntry = mutation({
  args: {
    /* ... */
  },
  handler: async (ctx, args) => {
    const startTime = Date.now()

    try {
      logger.info('Creating journal entry', {
        userId: args.userId,
        entryLength: args.content.length,
      })

      const entry = await ctx.db.insert('journalEntries', {
        ...args,
        createdAt: Date.now(),
      })

      logger.info('Journal entry created successfully', {
        entryId: entry,
        duration: Date.now() - startTime,
      })

      return entry
    } catch (error) {
      logger.error('Failed to create journal entry', {
        error: error.message,
        userId: args.userId,
        duration: Date.now() - startTime,
      })
      throw error
    }
  },
})
```

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Next Review**: February 2025
