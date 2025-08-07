# LangExtract Feature Flag Management Procedures

**Story LangExtract-3: Integration Testing & Production Readiness**

## Overview

This document outlines the procedures for managing the LangExtract feature flag throughout its lifecycle, from initial deployment to full rollout and eventual cleanup.

## Feature Flag Configuration

### Environment Variables

The LangExtract feature is controlled by the following environment variables:

```bash
# Primary feature flag
LANGEXTRACT_ENABLED=true|false

# Performance and safety controls
LANGEXTRACT_TIMEOUT_MS=5000
LANGEXTRACT_MAX_RETRIES=2
LANGEXTRACT_FALLBACK_ENABLED=true
LANGEXTRACT_PROCESSING_LIMIT=1000  # Max concurrent requests

# Monitoring and alerting
LANGEXTRACT_METRICS_ENABLED=true
LANGEXTRACT_ALERT_FAILURE_THRESHOLD=10  # Percentage
LANGEXTRACT_ALERT_LATENCY_THRESHOLD=5000  # Milliseconds
```

### Database Feature Flags

For more granular control, feature flags can also be managed via database settings:

```sql
-- Global feature flag
INSERT INTO feature_flags (name, enabled, created_at)
VALUES ('langextract_global', true, NOW());

-- User-specific rollout (percentage-based)
INSERT INTO feature_flags (name, enabled, rollout_percentage, created_at)
VALUES ('langextract_rollout', true, 25, NOW());

-- Admin override flag
INSERT INTO feature_flags (name, enabled, admin_only, created_at)
VALUES ('langextract_admin', true, true, NOW());
```

## Deployment Phases

### Phase 1: Internal Testing (0% rollout)

- **Duration**: 1-2 weeks
- **Scope**: Development and staging environments only
- **Configuration**:
  ```bash
  LANGEXTRACT_ENABLED=true  # Only in dev/staging
  LANGEXTRACT_ENABLED=false # In production
  ```
- **Validation**:
  - All unit tests pass
  - E2E tests complete successfully
  - Performance benchmarks meet requirements
  - Error handling works correctly

### Phase 2: Limited Beta (5% rollout)

- **Duration**: 1 week
- **Scope**: 5% of production users
- **Configuration**:
  ```bash
  LANGEXTRACT_ENABLED=true
  LANGEXTRACT_ROLLOUT_PERCENTAGE=5
  ```
- **Monitoring**:
  - Success rate > 95%
  - Average processing time < 3s
  - Fallback usage < 10%
  - No critical errors

### Phase 3: Gradual Rollout (25% → 50% → 75%)

- **Duration**: 3-4 weeks total
- **Scope**: Gradual increase every week
- **Configuration**: Update `LANGEXTRACT_ROLLOUT_PERCENTAGE` weekly
- **Go/No-Go Criteria**:
  - Success rate maintains > 95%
  - Processing time remains stable
  - User satisfaction scores unchanged
  - No increase in support tickets

### Phase 4: Full Rollout (100%)

- **Duration**: Ongoing
- **Scope**: All production users
- **Configuration**:
  ```bash
  LANGEXTRACT_ENABLED=true
  LANGEXTRACT_ROLLOUT_PERCENTAGE=100
  ```

### Phase 5: Flag Cleanup (3 months post-rollout)

- Remove feature flag code
- Clean up environment variables
- Update documentation
- Archive monitoring dashboards

## Operational Procedures

### Emergency Rollback

**Immediate Rollback** (< 5 minutes):

```bash
# Set environment variable
export LANGEXTRACT_ENABLED=false

# Or use Vercel CLI
vercel env add LANGEXTRACT_ENABLED false --environment=production

# Restart application
vercel --prod
```

**Database Rollback** (if env vars fail):

```sql
UPDATE feature_flags
SET enabled = false
WHERE name = 'langextract_global';
```

### Monitoring Alerts

Set up the following alerts in your monitoring system:

#### High Failure Rate Alert

```yaml
alert: LangExtractHighFailureRate
expr: langextract_failure_rate > 10
for: 5m
annotations:
  summary: 'LangExtract failure rate above 10%'
  description: 'Current failure rate: {{ $value }}%'
actions:
  - notify: dev-team
  - auto-rollback: if > 25%
```

#### High Latency Alert

```yaml
alert: LangExtractHighLatency
expr: langextract_avg_processing_time > 5000
for: 10m
annotations:
  summary: 'LangExtract processing time above 5s'
  description: 'Current avg time: {{ $value }}ms'
actions:
  - notify: dev-team
```

#### Fallback Usage Alert

```yaml
alert: LangExtractHighFallbackUsage
expr: langextract_fallback_rate > 50
for: 15m
annotations:
  summary: 'LangExtract fallback usage above 50%'
  description: 'Current fallback rate: {{ $value }}%'
actions:
  - investigate: processing-issues
```

### Performance Monitoring

#### Key Metrics to Track

1. **Success Rate**: `successful_requests / total_requests * 100`
2. **Processing Time**: P50, P95, P99 latencies
3. **Fallback Usage**: `fallback_requests / total_requests * 100`
4. **Error Types**: Categorized failure reasons
5. **Throughput**: Requests per minute/hour

#### Dashboard Setup

Create monitoring dashboards with:

- Real-time success rate graph
- Processing time distribution
- Error rate by type
- Hourly request volume
- Comparison with fallback performance

### Rollback Criteria

**Automatic Rollback Triggers**:

- Success rate drops below 85%
- Processing time exceeds 10 seconds (P95)
- More than 100 errors in 10 minutes
- Fallback usage exceeds 75%

**Manual Rollback Considerations**:

- User complaints increase significantly
- Support ticket volume spikes
- Infrastructure costs exceed budget
- Downstream service impacts

## Testing Procedures

### Pre-Deployment Validation

Before enabling the feature flag:

1. **Unit Test Suite**:

   ```bash
   npm test -- --testPathPattern="langextract"
   ```

2. **Integration Tests**:

   ```bash
   npm run test:integration -- --grep "LangExtract"
   ```

3. **E2E Tests**:

   ```bash
   npm run test:e2e -- tests/e2e/langextract-integration.spec.ts
   ```

4. **Performance Benchmarks**:
   ```bash
   npm run test:performance -- --feature=langextract
   ```

### Post-Deployment Validation

After enabling the feature flag:

1. **Smoke Tests** (immediate):
   - Create journal entry with LangExtract enabled
   - Verify structured insights appear
   - Check processing time is reasonable
   - Confirm fallback works if LangExtract fails

2. **Load Testing** (within 24 hours):
   - Run automated load tests
   - Monitor performance under typical load
   - Verify auto-scaling works correctly

3. **User Acceptance** (within 1 week):
   - Survey beta users
   - Monitor user engagement metrics
   - Check for usability issues

## Communication Plan

### Internal Communications

**Phase 1 - Internal Testing**:

- Slack: #engineering channel
- Email: Engineering team only
- Frequency: Daily updates during testing

**Phase 2 - Limited Beta**:

- Slack: #product, #engineering
- Email: Product and engineering teams
- Frequency: Daily for first 3 days, then weekly

**Phase 3 - Gradual Rollout**:

- Slack: #general, #product, #engineering
- Email: All stakeholders
- Frequency: Before each rollout increment

**Phase 4 - Full Rollout**:

- Slack: #general
- Email: Company-wide announcement
- Blog: Public announcement (optional)

### External Communications

**Customer Communications**:

- In-app notification: "Enhanced AI insights now available"
- Email: Feature announcement to power users
- Documentation: Update help articles

**Support Team Briefing**:

- Feature overview and benefits
- Common troubleshooting steps
- Escalation procedures
- FAQ updates

## Rollback Procedures

### Immediate Rollback (Critical Issues)

1. **Disable Feature Flag**:

   ```bash
   # Environment variable approach
   export LANGEXTRACT_ENABLED=false

   # Database approach
   UPDATE feature_flags SET enabled = false WHERE name = 'langextract_global';
   ```

2. **Verify Rollback**:
   - Check that new journal entries use fallback analysis
   - Confirm dashboard shows no LangExtract indicators
   - Monitor error rates return to baseline

3. **Communication**:
   - Immediate Slack notification to #engineering
   - Email to stakeholders within 30 minutes
   - Post-mortem scheduled within 24 hours

### Planned Rollback (Performance Issues)

1. **Gradual Reduction**:

   ```bash
   # Reduce rollout percentage
   export LANGEXTRACT_ROLLOUT_PERCENTAGE=50  # From 75%
   export LANGEXTRACT_ROLLOUT_PERCENTAGE=25  # From 50%
   export LANGEXTRACT_ROLLOUT_PERCENTAGE=0   # Complete rollback
   ```

2. **Monitor Impact**:
   - Track performance improvement
   - Ensure no user experience degradation
   - Plan optimization work

3. **Re-deployment Planning**:
   - Identify root cause
   - Implement fixes
   - Plan new rollout strategy

## Success Metrics

### Technical Metrics

- **Success Rate**: > 95%
- **Processing Time**: < 3s (P95)
- **Fallback Usage**: < 15%
- **Error Rate**: < 5%

### Business Metrics

- **User Engagement**: No decrease in journal entry creation
- **Satisfaction**: No increase in negative feedback
- **Support Load**: No increase in support tickets
- **Retention**: Maintain current user retention rates

### Long-term Metrics

- **Cost Efficiency**: Processing cost per analysis
- **Quality**: Accuracy of structured insights
- **Adoption**: Usage of enhanced features
- **Performance**: Overall application responsiveness

## Cleanup Procedures

### Post-Rollout Cleanup (3 months after 100% rollout)

1. **Code Cleanup**:

   ```bash
   # Remove feature flag checks
   git grep -r "LANGEXTRACT_ENABLED" --include="*.ts" --include="*.tsx"

   # Remove fallback code paths
   git grep -r "fallbackAnalysis" --include="*.ts"
   ```

2. **Environment Variables**:

   ```bash
   # Remove from all environments
   vercel env rm LANGEXTRACT_ENABLED
   vercel env rm LANGEXTRACT_ROLLOUT_PERCENTAGE
   ```

3. **Database Cleanup**:

   ```sql
   DELETE FROM feature_flags WHERE name LIKE 'langextract_%';
   ```

4. **Documentation Updates**:
   - Remove feature flag references
   - Update deployment procedures
   - Archive rollout documentation

5. **Monitoring**:
   - Archive beta monitoring dashboards
   - Keep production monitoring
   - Update alert thresholds

## Contact Information

### Escalation Path

**Level 1 - Engineering Team**:

- Slack: #engineering
- Email: engineering@company.com
- On-call: +1-XXX-XXX-XXXX

**Level 2 - Product Team**:

- Slack: #product
- Email: product@company.com

**Level 3 - Leadership**:

- Email: leadership@company.com
- Phone: Emergency contact list

### Subject Matter Experts

- **LangExtract Integration**: [Lead Developer Name]
- **Performance Monitoring**: [DevOps Engineer Name]
- **Feature Flags**: [Platform Engineer Name]
- **User Experience**: [Product Manager Name]
