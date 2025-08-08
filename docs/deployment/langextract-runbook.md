# LangExtract Production Runbook

## Overview

Operational procedures for enabling, monitoring, and rolling back the LangExtract integration.

## Feature Flags

- LANGEXTRACT_ENABLED: `true|false`
- LANGEXTRACT_ROLLOUT_PERCENT: `0-100`
- Sources: environment variables (`.env`, deployment platform config). Client-safe mirrors may use `NEXT_PUBLIC_*` variants.

## Rollout Stages

1. 0% (internal only)
2. 10%
3. 100%

Advance only if monitoring remains healthy for at least 24 hours.

## Enable / Disable Procedures

### Enable

1. Set `LANGEXTRACT_ENABLED=true` and desired `LANGEXTRACT_ROLLOUT_PERCENT`
2. Redeploy / apply config
3. Verify metrics (see Monitoring) remain within thresholds

### Disable (Immediate Rollback)

1. Set `LANGEXTRACT_ENABLED=false`
2. Redeploy / apply config
3. Observe metrics for 30 minutes to confirm return to baseline

## Monitoring & Alerting

Track the following metrics and thresholds:

- Success rate < 90% for 10 minutes → auto-disable + page on-call
- p95 end-to-end latency +2s vs baseline for 10 minutes → auto-disable + page
- Fallback activation > 5% in 10 minutes → warning

Suggested dashboards: AI pipeline reliability, LangExtract preprocessing latency, fallback frequency.

## On-Call Actions

1. If auto-disable triggers, confirm the flag is off and notify the team
2. Investigate error logs and recent deployments
3. Keep the flag off until a fix is validated in staging

## Troubleshooting

- Elevated latency: inspect LangExtract preprocessing time and upstream model queueing
- Increased fallbacks: check LangExtract service availability and input validation issues
- Data mismatches: verify schema optional fields and downstream consumers

## References

- `src/lib/constants/app-config.ts` for flag helpers
- `docs/stories/story-langextract-3-integration-testing.md`
