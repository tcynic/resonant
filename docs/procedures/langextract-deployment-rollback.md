# LangExtract Deployment and Rollback Procedures

**Story LangExtract-3: Integration Testing & Production Readiness**

## Overview

This document provides step-by-step procedures for deploying the LangExtract integration feature and handling rollbacks if issues arise.

## Pre-Deployment Checklist

### Development Environment Validation

- [ ] All unit tests pass (`npm test`)
- [ ] Integration tests pass (`npm run test:integration`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] TypeScript compilation succeeds (`npm run typecheck`)
- [ ] Code quality checks pass (`npm run lint`)
- [ ] Performance benchmarks meet requirements
- [ ] Security scan completed (no critical vulnerabilities)

### Staging Environment Validation

- [ ] Feature deployed and working in staging
- [ ] Manual testing completed with real data
- [ ] Performance testing under load completed
- [ ] Error handling scenarios tested
- [ ] Fallback mechanisms verified
- [ ] Monitoring dashboards configured
- [ ] Alert thresholds set appropriately

### Infrastructure Readiness

- [ ] Environment variables configured
- [ ] Feature flags created in database
- [ ] Monitoring systems updated
- [ ] Log aggregation configured
- [ ] Backup procedures verified
- [ ] Rollback plan documented and reviewed

## Deployment Procedures

### Phase 1: Infrastructure Preparation

#### 1.1 Environment Variables Setup

**Production Environment Variables**:

```bash
# Feature control
LANGEXTRACT_ENABLED=false  # Start disabled
LANGEXTRACT_ROLLOUT_PERCENTAGE=0

# Performance tuning
LANGEXTRACT_TIMEOUT_MS=5000
LANGEXTRACT_MAX_RETRIES=2
LANGEXTRACT_PROCESSING_LIMIT=500

# Monitoring
LANGEXTRACT_METRICS_ENABLED=true
LANGEXTRACT_ALERT_FAILURE_THRESHOLD=10
LANGEXTRACT_ALERT_LATENCY_THRESHOLD=5000

# Safety controls
LANGEXTRACT_FALLBACK_ENABLED=true
LANGEXTRACT_CIRCUIT_BREAKER_ENABLED=true
```

**Verification**:

```bash
# Verify environment variables are set
vercel env ls --environment=production | grep LANGEXTRACT
```

#### 1.2 Database Migration

**Schema Migration**:

```bash
# Deploy new schema with LangExtract metrics tables
npm run convex:deploy

# Verify migration completed successfully
npx convex dashboard  # Check schema in web interface
```

**Feature Flag Initialization**:

```sql
-- Create feature flags (if not using environment variables)
INSERT INTO feature_flags (name, enabled, rollout_percentage, created_at, updated_at)
VALUES ('langextract_global', false, 0, NOW(), NOW());

INSERT INTO feature_flags (name, enabled, admin_only, created_at, updated_at)
VALUES ('langextract_admin', true, true, NOW(), NOW());
```

### Phase 2: Code Deployment

#### 2.1 Deploy to Staging

```bash
# Ensure clean working directory
git status

# Deploy to staging
vercel --target staging

# Run post-deployment verification
npm run test:e2e -- --env=staging
```

#### 2.2 Deploy to Production

```bash
# Final checks
npm run build
npm run typecheck
npm test

# Deploy to production (feature still disabled)
vercel --prod

# Verify deployment
curl -I https://your-app.vercel.app/health
```

### Phase 3: Feature Activation

#### 3.1 Admin-Only Testing (Internal)

```bash
# Enable for admin users only
vercel env add LANGEXTRACT_ADMIN_ENABLED true --environment=production

# Or via database
UPDATE feature_flags SET enabled = true WHERE name = 'langextract_admin';
```

**Verification Steps**:

1. Log in as admin user
2. Create test journal entry
3. Verify LangExtract processing occurs
4. Check structured insights display correctly
5. Monitor performance metrics

#### 3.2 Limited Beta (5% rollout)

```bash
# Enable feature for 5% of users
vercel env add LANGEXTRACT_ENABLED true --environment=production
vercel env add LANGEXTRACT_ROLLOUT_PERCENTAGE 5 --environment=production
```

**Monitoring Checklist**:

- [ ] Success rate > 95%
- [ ] Average processing time < 3s
- [ ] Fallback usage < 10%
- [ ] No critical errors in logs
- [ ] User feedback positive

#### 3.3 Gradual Rollout

**Week 1 - 25% rollout**:

```bash
vercel env add LANGEXTRACT_ROLLOUT_PERCENTAGE 25 --environment=production
```

**Week 2 - 50% rollout**:

```bash
vercel env add LANGEXTRACT_ROLLOUT_PERCENTAGE 50 --environment=production
```

**Week 3 - 75% rollout**:

```bash
vercel env add LANGEXTRACT_ROLLOUT_PERCENTAGE 75 --environment=production
```

**Week 4 - 100% rollout**:

```bash
vercel env add LANGEXTRACT_ROLLOUT_PERCENTAGE 100 --environment=production
```

### Phase 4: Post-Deployment Validation

#### 4.1 Smoke Tests

Run after each rollout phase:

```bash
# Automated smoke tests
npm run test:smoke -- --feature=langextract

# Manual verification
# 1. Create journal entry
# 2. Verify processing completes
# 3. Check structured insights appear
# 4. Verify dashboard updates
# 5. Test error scenarios
```

#### 4.2 Performance Validation

```bash
# Run load tests
npm run test:load -- --duration=5m --users=100

# Check performance metrics
curl -s https://your-app.vercel.app/api/metrics/langextract | jq '.'

# Verify monitoring alerts are working
# (Should receive test alert)
```

## Rollback Procedures

### Immediate Rollback (Critical Issues)

#### Emergency Rollback (< 5 minutes)

**Option 1: Environment Variables**

```bash
# Disable feature immediately
vercel env add LANGEXTRACT_ENABLED false --environment=production

# Verify rollback
curl -s "https://your-app.vercel.app/api/debug/feature-flags" | grep langextract
```

**Option 2: Database Feature Flag**

```sql
-- If environment variables fail
UPDATE feature_flags SET enabled = false WHERE name = 'langextract_global';
UPDATE feature_flags SET rollout_percentage = 0 WHERE name = 'langextract_rollout';
```

**Option 3: Code Rollback**

```bash
# If feature flags fail, rollback entire deployment
vercel rollback --deployment=<previous-deployment-id>
```

#### Verification Steps

After emergency rollback:

1. [ ] Verify new journal entries use fallback analysis only
2. [ ] Confirm dashboard shows no LangExtract indicators
3. [ ] Check error rates return to baseline
4. [ ] Monitor user experience for any issues
5. [ ] Verify performance metrics are stable

### Planned Rollback (Performance Issues)

#### Gradual Rollback

**Reduce Rollout Percentage**:

```bash
# From 100% to 75%
vercel env add LANGEXTRACT_ROLLOUT_PERCENTAGE 75 --environment=production

# From 75% to 50%
vercel env add LANGEXTRACT_ROLLOUT_PERCENTAGE 50 --environment=production

# From 50% to 25%
vercel env add LANGEXTRACT_ROLLOUT_PERCENTAGE 25 --environment=production

# From 25% to 0%
vercel env add LANGEXTRACT_ROLLOUT_PERCENTAGE 0 --environment=production
```

**Monitor Between Steps**:

- Wait 15 minutes between percentage reductions
- Check performance metrics improve
- Verify no user experience degradation
- Monitor error rates and success rates

#### Complete Feature Rollback

```bash
# Disable feature completely
vercel env add LANGEXTRACT_ENABLED false --environment=production
vercel env add LANGEXTRACT_ROLLOUT_PERCENTAGE 0 --environment=production

# Clean up any stuck processing
# (Convex functions will handle gracefully)
```

### Rollback Communication

#### Internal Communication

**Immediate (< 15 minutes)**:

```markdown
Slack: #engineering
🚨 ROLLBACK ALERT: LangExtract feature disabled due to [REASON]

- Action taken: [SPECIFIC ROLLBACK ACTION]
- Impact: [DESCRIBE USER IMPACT]
- Next steps: [POST-MORTEM/INVESTIGATION PLAN]
- ETA for resolution: [TIME ESTIMATE]
```

**Follow-up (< 1 hour)**:

```markdown
Email: engineering@company.com, product@company.com
Subject: LangExtract Rollback - Incident Report

Summary:

- Issue: [DETAILED DESCRIPTION]
- Timeline: [CHRONOLOGICAL EVENTS]
- Rollback action: [WHAT WAS DONE]
- Current status: [SYSTEM STATE]
- Investigation plan: [NEXT STEPS]
```

#### External Communication (if needed)

**User Notification** (for major rollbacks):

```markdown
In-app message:
"We're temporarily using our standard analysis system while we optimize our enhanced insights feature. Your journal entries continue to be processed normally."
```

**Support Team Brief**:

```markdown
- Feature temporarily disabled
- Users may notice missing "Enhanced Insights" indicators
- All core functionality remains available
- No data loss or corruption
- ETA for re-enable: [TIMEFRAME]
```

## Monitoring and Alerting

### Key Metrics During Deployment

#### Success Metrics

- **Processing Success Rate**: > 95%
- **Average Processing Time**: < 3 seconds
- **Fallback Usage Rate**: < 15%
- **Error Rate**: < 5%
- **User Satisfaction**: No decrease in NPS

#### Warning Thresholds

- **Processing Success Rate**: < 95%
- **Average Processing Time**: > 5 seconds
- **Fallback Usage Rate**: > 25%
- **Error Rate**: > 10%

#### Critical Thresholds (Auto-rollback)

- **Processing Success Rate**: < 85%
- **Average Processing Time**: > 10 seconds
- **Error Rate**: > 25%
- **High-severity errors**: > 10 in 5 minutes

### Monitoring Dashboard

Access monitoring at: `https://your-monitoring-dashboard.com/langextract`

**Key Panels**:

1. Real-time success rate
2. Processing time distribution (P50, P95, P99)
3. Error rate by type
4. Fallback usage percentage
5. Request volume over time
6. User impact metrics

### Alert Configurations

#### Slack Alerts

```yaml
# High failure rate
- channel: '#engineering'
  condition: 'failure_rate > 10%'
  frequency: 'every 5 minutes'
  escalation: 'page on-call after 15 minutes'

# High latency
- channel: '#engineering'
  condition: 'avg_processing_time > 5000ms'
  frequency: 'every 10 minutes'

# Critical errors
- channel: '#engineering'
  condition: 'critical_errors > 5 in 5min'
  frequency: 'immediate'
  escalation: 'page on-call immediately'
```

#### Email Alerts

```yaml
# Daily summary
- recipients: ['engineering@company.com', 'product@company.com']
  schedule: 'daily at 9am'
  content: 'LangExtract performance summary'

# Weekly rollout report
- recipients: ['leadership@company.com']
  schedule: 'weekly on Friday'
  content: 'Feature rollout progress and metrics'
```

## Troubleshooting

### Common Issues and Solutions

#### High Processing Times

**Symptoms**:

- Average processing time > 5 seconds
- User complaints about slow analysis

**Investigation**:

```bash
# Check processing time distribution
curl -s "https://your-app.vercel.app/api/metrics/langextract/latency"

# Check for bottlenecks
curl -s "https://your-app.vercel.app/api/debug/langextract/processing"
```

**Solutions**:

1. Increase timeout threshold
2. Optimize LangExtract configuration
3. Scale up processing resources
4. Implement request queuing

#### High Fallback Usage

**Symptoms**:

- Fallback usage > 50%
- Missing structured insights in dashboard

**Investigation**:

```bash
# Check error patterns
curl -s "https://your-app.vercel.app/api/metrics/langextract/errors"

# Check LangExtract service status
curl -s "https://langextract-api.com/health"
```

**Solutions**:

1. Check LangExtract API key and quotas
2. Verify network connectivity
3. Review request format and validation
4. Consider temporary rate limiting

#### Database Performance Issues

**Symptoms**:

- Slow dashboard loading
- Metrics collection failures

**Investigation**:

```sql
-- Check metrics table size
SELECT COUNT(*) FROM langExtractMetrics WHERE createdAt > NOW() - INTERVAL '24 HOURS';

-- Check query performance
EXPLAIN ANALYZE SELECT * FROM langExtractMetrics WHERE userId = 'test-user';
```

**Solutions**:

1. Implement data retention policies
2. Add database indexes
3. Archive old metrics data
4. Optimize queries

### Recovery Procedures

#### After Rollback - Preparing for Re-deployment

1. **Root Cause Analysis**:
   - Identify the specific issue that caused rollback
   - Document timeline and impact
   - Create action items for fixes

2. **Fix Implementation**:
   - Develop and test fixes in development
   - Validate fixes in staging environment
   - Update monitoring and alerting if needed

3. **Re-deployment Planning**:
   - Start with smaller rollout percentage
   - Increase monitoring frequency
   - Plan for faster rollback if needed

4. **Stakeholder Communication**:
   - Brief team on lessons learned
   - Update deployment procedures
   - Adjust rollout timeline if necessary

## Contact Information

### Emergency Contacts

**Primary On-Call Engineer**: +1-XXX-XXX-XXXX
**Secondary On-Call Engineer**: +1-XXX-XXX-XXXX
**Engineering Manager**: +1-XXX-XXX-XXXX

### Escalation Matrix

| Severity      | Contact                 | Response Time     |
| ------------- | ----------------------- | ----------------- |
| P0 (Critical) | On-call engineer        | 15 minutes        |
| P1 (High)     | Engineering team        | 1 hour            |
| P2 (Medium)   | Product team            | 4 hours           |
| P3 (Low)      | Regular sprint planning | Next business day |

### Communication Channels

- **Immediate**: Slack #engineering
- **Formal**: engineering@company.com
- **Leadership**: leadership@company.com
- **External**: support@company.com

---

**Document Version**: 1.0  
**Last Updated**: [Current Date]  
**Next Review**: [30 days from last update]  
**Owner**: [Engineering Team Lead]
