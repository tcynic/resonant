# Deployment and Environment Configuration Guide

This guide covers production deployment for the Resonant relationship health journal application built with Next.js 15 and Convex real-time backend.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Convex Deployment](#convex-deployment)
4. [Next.js Deployment (Vercel)](#nextjs-deployment-vercel)
5. [Alternative Deployment Platforms](#alternative-deployment-platforms)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Monitoring and Analytics](#monitoring-and-analytics)
8. [Security Configuration](#security-configuration)
9. [Domain and SSL Configuration](#domain-and-ssl-configuration)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts and Services

- **Convex Account**: [Sign up at convex.dev](https://convex.dev)
- **Vercel Account**: [Sign up at vercel.com](https://vercel.com) (recommended for Next.js)
- **Clerk Account**: [Sign up at clerk.com](https://clerk.com) (for authentication)
- **Google Cloud Account**: For Gemini AI API access
- **Git Repository**: GitHub, GitLab, or Bitbucket

### Development Requirements

- Node.js 18.17 or later
- npm, yarn, or pnpm
- Git

## Environment Configuration

### Required Environment Variables

Create a comprehensive `.env.local` file for development and configure these variables in your deployment platform:

```bash
# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=                 # From `npx convex dev` output
CONVEX_DEPLOY_KEY=                      # For production deployment

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=      # From Clerk dashboard
CLERK_SECRET_KEY=                       # From Clerk dashboard
CLERK_WEBHOOK_SECRET=                   # For user synchronization webhooks

# AI Features
GOOGLE_GEMINI_API_KEY=                  # For AI analysis features

# Analytics (Optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=          # Google Analytics 4
VERCEL_ANALYTICS_ID=                    # Vercel Analytics

# Monitoring (Optional)
SENTRY_DSN=                            # Error tracking
SENTRY_ORG=                            # Sentry organization
SENTRY_PROJECT=                        # Sentry project
```

### Environment Variable Setup by Platform

#### Vercel Environment Variables

1. **In Vercel Dashboard:**
   - Navigate to your project → Settings → Environment Variables
   - Add each variable with appropriate environment scope (Production, Preview, Development)
   - Critical: Set `CONVEX_DEPLOY_KEY` for automatic Convex deployments

2. **Via Vercel CLI:**
   ```bash
   vercel env add NEXT_PUBLIC_CONVEX_URL production
   vercel env add CONVEX_DEPLOY_KEY production
   vercel env add CLERK_SECRET_KEY production
   ```

#### Other Platforms

For platforms like Netlify, Railway, or self-hosted solutions, configure environment variables through their respective dashboards or deployment configurations.

## Convex Deployment

### Initial Setup

1. **Install Convex CLI:**

   ```bash
   npm install -g convex
   ```

2. **Initialize Convex Project:**
   ```bash
   npx convex dev
   ```
   This creates your development deployment and provides the `NEXT_PUBLIC_CONVEX_URL`.

### Production Deployment

1. **Deploy to Production:**

   ```bash
   npx convex deploy --cmd 'npm run build'
   ```

2. **Get Production URL:**

   ```bash
   npx convex deployment:url
   ```

   Use this URL as your production `NEXT_PUBLIC_CONVEX_URL`.

3. **Configure Deploy Key for CI/CD:**
   ```bash
   npx convex auth:key
   ```
   Use the generated key as `CONVEX_DEPLOY_KEY` in your deployment platform.

### Convex Configuration

**convex.json:**

```json
{
  "functions": "convex/",
  "generateCommonJSApi": false,
  "modules": []
}
```

### Database Schema Deployment

The schema is automatically deployed with your functions. Ensure your `convex/schema.ts` is properly configured for production with appropriate indexes:

```typescript
// Key indexes for production performance
export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    tier: v.union(v.literal('free'), v.literal('premium')),
    // ... other fields
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_tier', ['tier']),
  // ... other tables with strategic indexes
})
```

## Next.js Deployment (Vercel)

### Automatic Deployment (Recommended)

1. **Connect Repository:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub/GitLab/Bitbucket repository
   - Vercel auto-detects Next.js configuration

2. **Configure Build Settings:**

   ```bash
   # Build Command (default)
   npm run build

   # Output Directory (default)
   .next

   # Install Command (default)
   npm install
   ```

3. **Add Environment Variables:**
   During import, click "Environment Variables" and add all required variables from your `.env.local`.

### Manual Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel

# Deploy to production
vercel --prod
```

### Next.js Configuration for Production

**next.config.js:**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    serverComponentsExternalPackages: ['convex'],
  },

  // Optimize for production
  swcMinify: true,

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
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

### Build Optimization

**package.json scripts for production:**

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "deploy": "npm run build && vercel --prod",
    "prebuild": "npm run convex:codegen-optional && npm run lint && npm run format:check",
    "convex:deploy": "npx convex deploy --cmd 'npm run build'"
  }
}
```

## Alternative Deployment Platforms

### Netlify

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NEXT_TELEMETRY_DISABLED = "1"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Railway

```json
{
  "name": "resonant",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health"
  }
}
```

### Self-Hosted (Docker)

**Dockerfile:**

```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

**Enable standalone output in next.config.js:**

```javascript
module.exports = {
  output: 'standalone',
  // ... other config
}
```

## CI/CD Pipeline

### GitHub Actions for Vercel + Convex

**.github/workflows/deploy.yml:**

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:ci

      - name: Run linting
        run: npm run lint

      - name: Type check
        run: npm run typecheck

  deploy-convex:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Deploy Convex
        run: npx convex deploy --cmd 'npm run build'
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}

  deploy-vercel:
    needs: [test, deploy-convex]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### GitLab CI/CD

**.gitlab-ci.yml:**

```yaml
stages:
  - test
  - deploy-backend
  - deploy-frontend

variables:
  NODE_VERSION: '18'

test:
  stage: test
  image: node:$NODE_VERSION
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run test:ci
    - npm run lint
    - npm run typecheck

deploy-convex:
  stage: deploy-backend
  image: node:$NODE_VERSION
  only:
    - main
  script:
    - npm ci
    - npx convex deploy --cmd 'npm run build'
  variables:
    CONVEX_DEPLOY_KEY: $CONVEX_DEPLOY_KEY

deploy-vercel:
  stage: deploy-frontend
  image: node:$NODE_VERSION
  only:
    - main
  script:
    - npm install -g vercel
    - vercel --token $VERCEL_TOKEN --prod
  variables:
    VERCEL_TOKEN: $VERCEL_TOKEN
    VERCEL_ORG_ID: $VERCEL_ORG_ID
    VERCEL_PROJECT_ID: $VERCEL_PROJECT_ID
```

## Monitoring and Analytics

### Health Check Endpoint

Create **pages/api/health.ts:**

```typescript
import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  })
}
```

### Convex Health Monitoring

**convex/health.ts:**

```typescript
import { query } from './_generated/server'

export const healthCheck = query({
  args: {},
  handler: async ctx => {
    // Check database connectivity
    const testQuery = await ctx.db.query('users').first()

    return {
      status: 'healthy',
      timestamp: Date.now(),
      database: 'connected',
      version: '1.0.0',
    }
  },
})
```

### Vercel Analytics

Add to **app/layout.tsx:**

```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Error Tracking with Sentry

**sentry.client.config.ts:**

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
})
```

## Security Configuration

### Content Security Policy

**next.config.js:**

```javascript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' *.clerk.com *.convex.dev;
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: *.clerk.com;
      font-src 'self';
      connect-src 'self' *.clerk.com *.convex.dev *.convex.cloud *.googleapis.com;
      frame-src 'self' *.clerk.com;
    `
      .replace(/\s{2,}/g, ' ')
      .trim(),
  },
]

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}
```

### Clerk Production Configuration

1. **Configure Production Instance:**
   - Create production Clerk instance
   - Set up OAuth providers (Google, GitHub, etc.)
   - Configure user management settings

2. **Webhook Configuration:**

   ```bash
   # Production webhook URL
   https://your-domain.com/api/webhooks/clerk

   # Events to listen for
   user.created, user.updated, user.deleted
   ```

3. **Clerk Environment Variables:**
   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

## Domain and SSL Configuration

### Custom Domain Setup (Vercel)

1. **Add Domain in Vercel:**
   - Go to Project Settings → Domains
   - Add your custom domain (e.g., `resonant.app`)

2. **Configure DNS:**

   ```
   # A Record
   @ -> 76.76.19.19

   # CNAME Record
   www -> cname.vercel-dns.com
   ```

3. **SSL Certificate:**
   Vercel automatically provisions SSL certificates via Let's Encrypt.

### Custom Domain for Convex

Convex provides `*.convex.site` domains by default. For custom domains:

1. **Contact Convex Support** for enterprise custom domain setup
2. **Use CNAME for API calls** if needed for branding

## Troubleshooting

### Common Deployment Issues

1. **Build Failures:**

   ```bash
   # Check TypeScript errors
   npm run typecheck

   # Check for linting issues
   npm run lint

   # Verify environment variables
   echo $NEXT_PUBLIC_CONVEX_URL
   ```

2. **Convex Connection Issues:**

   ```bash
   # Verify Convex deployment
   npx convex status

   # Test Convex functions
   npx convex run functions:healthCheck
   ```

3. **Authentication Issues:**
   - Verify Clerk webhook endpoints are accessible
   - Check CORS settings for Clerk
   - Ensure webhook secrets match

4. **Performance Issues:**

   ```bash
   # Analyze bundle size
   npm run build
   npx @next/bundle-analyzer

   # Check Convex function performance
   # Use Convex dashboard function logs
   ```

### Debug Commands

```bash
# Development debugging
npm run dev
npm run convex:dev

# Production testing
npm run build
npm start

# Database verification
npx convex dashboard

# Function testing
npx convex run myFunction --arg1 "test"
```

### Rollback Procedures

1. **Convex Rollback:**

   ```bash
   npx convex rollback <snapshot-id>
   ```

2. **Vercel Rollback:**
   - Via dashboard: Deployments → Previous deployment → Promote to Production
   - Via CLI: `vercel rollback [deployment-url]`

### Support Resources

- **Convex Documentation**: [docs.convex.dev](https://docs.convex.dev)
- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Clerk Documentation**: [clerk.com/docs](https://clerk.com/docs)

## Post-Deployment Checklist

- [ ] Verify all environment variables are set correctly
- [ ] Test authentication flow with real users
- [ ] Check Convex functions are responding
- [ ] Validate database queries and mutations
- [ ] Test AI analysis features
- [ ] Verify webhook endpoints are working
- [ ] Check error tracking is operational
- [ ] Validate SSL certificates
- [ ] Test performance and load times
- [ ] Verify analytics are tracking correctly
- [ ] Test mobile responsive design
- [ ] Validate backup and monitoring systems

## Maintenance and Updates

### Regular Tasks

1. **Weekly:**
   - Monitor error rates and performance
   - Check dependency updates
   - Review user feedback

2. **Monthly:**
   - Update dependencies (`npm update`)
   - Review and rotate API keys
   - Database performance analysis

3. **Quarterly:**
   - Security audit
   - Backup testing
   - Performance optimization review

This deployment guide ensures a robust, secure, and scalable production environment for the Resonant application.
