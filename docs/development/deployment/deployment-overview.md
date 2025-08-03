# Resonant Production Deployment Guide

This guide provides step-by-step instructions for deploying Resonant to production.

## 🚀 Pre-Deployment Checklist

### Development Environment Verification

- [ ] All tests passing (`npm test` and `npm run test:e2e`)
- [ ] TypeScript compilation successful (`npm run typecheck`)
- [ ] Code quality checks passing (`npm run lint`)
- [ ] Production build successful (`npm run build`)

### Dependencies and Security

- [ ] All dependencies updated to stable versions
- [ ] Security audit completed (`npm audit`)
- [ ] No development secrets in production environment files
- [ ] All environment variables documented and configured

## 🔧 Production Infrastructure Setup

### 1. Convex Production Deployment

```bash
# Deploy Convex functions to production
npx convex deploy --prod

# Note the production deployment URL and update .env.production
```

**Post-deployment verification:**

- [ ] Production Convex URL obtained
- [ ] Database schema deployed successfully
- [ ] All functions accessible in production
- [ ] Data migrations completed (if any)

### 2. Clerk Production Configuration

1. **Create Production Instance**
   - Go to [Clerk Dashboard](https://dashboard.clerk.com)
   - Create new production application or promote development instance
   - Configure production domain and redirect URLs

2. **Update Authentication Settings**
   - [ ] Production domain configured in Clerk
   - [ ] Redirect URLs updated for production domain
   - [ ] Social login providers configured for production
   - [ ] Production API keys generated

3. **Required Environment Variables:**
   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   ```

### 3. Environment Variables Configuration

Copy `.env.production` and replace all placeholder values:

```bash
# Copy production template
cp .env.production .env.local.production

# Edit and replace all REPLACE_WITH_* values
```

**Critical Variables to Configure:**

- [ ] `NEXT_PUBLIC_CONVEX_URL` - Production Convex deployment URL
- [ ] `CONVEX_DEPLOYMENT` - Production deployment identifier
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Production Clerk key
- [ ] `CLERK_SECRET_KEY` - Production Clerk secret
- [ ] `GOOGLE_GEMINI_API_KEY` - AI features (Phase 2)

## 🌐 Platform Deployment

### Option A: Vercel (Recommended)

1. **Connect Repository**

   ```bash
   # Install Vercel CLI
   npm install -g vercel

   # Deploy to Vercel
   vercel --prod
   ```

2. **Configure Environment Variables**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all production environment variables
   - Ensure "Production" environment is selected for each variable

3. **Custom Domain Configuration**
   - Add custom domain in Vercel dashboard
   - Configure DNS records as instructed
   - Enable automatic SSL certificate

4. **Vercel-Specific Settings**
   - [ ] Build command: `npm run build`
   - [ ] Output directory: `.next`
   - [ ] Install command: `npm install`
   - [ ] Node.js version: 18.x or higher

### Option B: Other Platforms

For other deployment platforms (AWS, Digital Ocean, Railway, etc.):

1. **Build Application**

   ```bash
   npm run build
   ```

2. **Configure Platform**
   - Set Node.js version to 18+
   - Configure environment variables
   - Set build command: `npm run build`
   - Set start command: `npm start`

3. **Health Checks**
   - Configure health check endpoint: `/api/health` (if implemented)
   - Set appropriate timeout values
   - Configure auto-restart policies

## 🔒 Security Configuration

### Environment Security

- [ ] All secrets stored in platform secret management (not in code)
- [ ] Production environment variables verified
- [ ] No development credentials in production
- [ ] API rate limiting configured

### Authentication Security

- [ ] Clerk production instance properly configured
- [ ] HTTPS enforced for all routes
- [ ] Secure session management verified
- [ ] CORS policies properly configured

### Database Security

- [ ] Convex production deployment secured
- [ ] Database access controls configured
- [ ] Data encryption in transit and at rest
- [ ] Backup and recovery procedures established

## 📊 Monitoring and Observability

### Basic Monitoring

- [ ] Application health checks configured
- [ ] Error tracking set up (Sentry recommended)
- [ ] Performance monitoring enabled
- [ ] Uptime monitoring configured

### Optional Advanced Monitoring

- [ ] User analytics (PostHog, Google Analytics)
- [ ] Application performance monitoring (APM)
- [ ] Database performance monitoring
- [ ] Custom metrics and alerts

## 🧪 Production Testing

### Smoke Tests

- [ ] Homepage loads correctly
- [ ] User registration flow works
- [ ] User login flow works
- [ ] Journal entry creation works
- [ ] Relationship management works
- [ ] All critical user paths functional

### Performance Tests

- [ ] Page load times acceptable (< 3 seconds)
- [ ] Database queries optimized
- [ ] Images and assets optimized
- [ ] Bundle size acceptable

### Security Tests

- [ ] Authentication flows secure
- [ ] Authorization working correctly
- [ ] No sensitive data exposed
- [ ] HTTPS properly configured

## 🔄 Post-Deployment Tasks

### Immediate (First 24 hours)

- [ ] Monitor error rates and performance
- [ ] Verify all user flows working
- [ ] Check authentication and authorization
- [ ] Monitor database performance
- [ ] Verify email/notification systems

### Ongoing Maintenance

- [ ] Set up automated backups
- [ ] Configure monitoring alerts
- [ ] Document incident response procedures
- [ ] Plan regular security updates
- [ ] Schedule performance reviews

## 🆘 Troubleshooting Common Issues

### Authentication Problems

```bash
# Check Clerk configuration
# Verify redirect URLs match production domain
# Confirm API keys are for production instance
```

### Database Connection Issues

```bash
# Verify Convex production deployment
# Check environment variables
# Confirm network connectivity
```

### Build/Deployment Failures

```bash
# Check Node.js version compatibility
# Verify all dependencies installed
# Review build logs for specific errors
```

### Performance Issues

```bash
# Check bundle size: npm run build
# Review database query performance
# Verify CDN and caching configuration
```

## 🚨 Rollback Procedures

### Quick Rollback (Vercel)

```bash
# Rollback to previous deployment
vercel --prod --rollback
```

### Manual Rollback

1. Identify last known good deployment
2. Revert code changes if necessary
3. Redeploy with verified configuration
4. Verify all systems operational

## 📞 Support and Resources

- **Convex Support**: [docs.convex.dev](https://docs.convex.dev/)
- **Clerk Support**: [clerk.com/docs](https://clerk.com/docs)
- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **Vercel Support**: [vercel.com/docs](https://vercel.com/docs)

## 📋 Deployment Checklist Summary

**Pre-Deployment:**

- [ ] All tests passing
- [ ] Security audit completed
- [ ] Environment variables configured
- [ ] Production infrastructure ready

**Deployment:**

- [ ] Convex deployed to production
- [ ] Clerk production instance configured
- [ ] Application deployed to platform
- [ ] Custom domain configured

**Post-Deployment:**

- [ ] Smoke tests completed
- [ ] Monitoring configured
- [ ] Performance verified
- [ ] Documentation updated

**Sign-off:**

- [ ] Technical lead approval
- [ ] Security review completed
- [ ] Stakeholder notification sent
- [ ] Go-live communication distributed

---

**Remember**: Always test thoroughly in a staging environment before deploying to production!
