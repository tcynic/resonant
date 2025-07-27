# Deployment Checklist

Use this checklist to ensure consistent and reliable deployments to staging and production environments.

## Pre-Deployment Checklist

### Code Quality & Testing
- [ ] All tests pass locally (`npm run test:ci`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Code is properly formatted (`npm run format:check`)
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Build completes successfully (`npm run build`)
- [ ] E2E tests pass (`npm run test:e2e`)

### Environment Preparation
- [ ] Environment variables are configured for target environment
- [ ] Database schema changes are reviewed and approved
- [ ] API rate limits are appropriate for expected load
- [ ] Feature flags are configured correctly
- [ ] Monitoring and alerting is set up

### Security Review
- [ ] Dependencies are up to date (`npm audit`)
- [ ] No sensitive data is being committed
- [ ] Environment secrets are properly secured
- [ ] Webhook signatures are verified
- [ ] CORS policies are configured

### Performance Verification
- [ ] Bundle size is within acceptable limits
- [ ] Critical user paths are optimized
- [ ] Database queries are efficient
- [ ] Images and assets are optimized
- [ ] CDN caching is configured

## Staging Deployment

### Pre-Deployment
- [ ] Create feature branch from `main`
- [ ] Run all quality checks: `npm run check`
- [ ] Run comprehensive tests: `npm run ci:test-pipeline`
- [ ] Verify staging environment variables

### Deployment Steps
- [ ] Deploy Convex backend: `npx convex deploy` (with staging key)
- [ ] Deploy frontend: `vercel --target preview`
- [ ] Run health checks: `npm run deploy:health-check`
- [ ] Verify deployment URL is working

### Post-Deployment Testing
- [ ] Authentication flow works
- [ ] Journal entry creation/editing works
- [ ] Relationship management works
- [ ] Search functionality works
- [ ] AI analysis works
- [ ] Real-time updates work
- [ ] Mobile responsiveness verified

### Staging Sign-off
- [ ] Product owner review completed
- [ ] QA testing completed
- [ ] Performance benchmarks met
- [ ] Security scan passed
- [ ] Accessibility check passed

## Production Deployment

### Pre-Deployment
- [ ] Staging deployment is stable and approved
- [ ] Production environment variables are configured
- [ ] Database backup is created (if applicable)
- [ ] Monitoring dashboards are ready
- [ ] On-call engineer is available
- [ ] Rollback plan is prepared

### Deployment Window
- [ ] Announce deployment start
- [ ] Put system in maintenance mode (if needed)
- [ ] Deploy Convex backend: `npx convex deploy` (with production key)
- [ ] Deploy frontend: `vercel --prod`
- [ ] Remove maintenance mode

### Immediate Post-Deployment (0-15 minutes)
- [ ] Health checks pass: `npm run deploy:health-check`
- [ ] Critical user flows tested manually
- [ ] Error rates are normal (<1%)
- [ ] Response times are acceptable (<2s)
- [ ] Real-time features functioning
- [ ] Authentication working correctly

### Extended Monitoring (15-60 minutes)
- [ ] User activity metrics are normal
- [ ] Database performance is stable
- [ ] No error spikes in logs
- [ ] AI service functioning correctly
- [ ] Email notifications working
- [ ] Search functionality verified

### Post-Deployment Tasks
- [ ] Update deployment log
- [ ] Notify team of successful deployment
- [ ] Update status page (if applicable)
- [ ] Create deployment tag: `git tag deploy-$(date +%Y%m%d-%H%M%S)`
- [ ] Document any issues encountered

## Rollback Procedures

### When to Rollback
- [ ] Error rate exceeds 5%
- [ ] Response time exceeds 5 seconds consistently
- [ ] Critical features are broken
- [ ] Security vulnerability discovered
- [ ] Data integrity issues

### Rollback Steps
- [ ] Announce rollback decision
- [ ] Identify last known good deployment
- [ ] Rollback Vercel: `vercel rollback <deployment-url>`
- [ ] Rollback Convex (redeploy previous version)
- [ ] Verify rollback health
- [ ] Update team on rollback completion

### Post-Rollback
- [ ] Investigate root cause
- [ ] Create incident report
- [ ] Plan fix for issues
- [ ] Update deployment procedures if needed

## Emergency Deployment

### Emergency Criteria
- [ ] Critical security vulnerability
- [ ] Data loss prevention
- [ ] Service outage fix
- [ ] Legal/compliance requirement

### Emergency Process
- [ ] Get approval from engineering manager
- [ ] Skip normal approval process (with documentation)
- [ ] Deploy with minimal testing
- [ ] Monitor closely post-deployment
- [ ] Follow up with full testing cycle

## Environment-Specific Notes

### Staging Environment
- **Purpose**: Feature testing, integration testing, demo
- **Data**: Test data only, can be reset
- **Monitoring**: Basic monitoring, development alerts
- **Access**: Team members, stakeholders

### Production Environment
- **Purpose**: Live user traffic
- **Data**: Real user data, critical to protect
- **Monitoring**: Full monitoring suite, production alerts
- **Access**: Limited to deployment personnel

## Troubleshooting Common Issues

### Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build

# Check environment variables
npm run deploy:health-check
```

### Convex Deployment Issues
```bash
# Check deployment key
npx convex env list

# Verify schema
npx convex schema

# Check function logs
npx convex logs --tail
```

### Vercel Deployment Issues
```bash
# Check deployment logs
vercel logs

# Verify environment variables
vercel env ls

# Check project settings
vercel project
```

### Authentication Issues
```bash
# Verify Clerk configuration
curl -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  https://api.clerk.dev/v1/users

# Check webhook delivery in Clerk dashboard
```

### Performance Issues
```bash
# Monitor response times
npm run test:performance

# Check bundle size
npm run build
npx @next/bundle-analyzer

# Profile database queries
npx convex dashboard
```

## Tools and Commands

### Useful Commands
```bash
# Complete deployment pipeline
npm run deploy:full-production

# Health check only
npm run deploy:health-check

# Check all environments
npm run check

# Performance monitoring
npm run test:performance

# Bundle analysis
ANALYZE=true npm run build
```

### Monitoring URLs
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Convex Dashboard**: https://dashboard.convex.dev
- **Clerk Dashboard**: https://dashboard.clerk.dev
- **Application Health**: https://yourdomain.com/api/health

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Next Review**: February 2025