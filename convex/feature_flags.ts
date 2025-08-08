/**
 * LangExtract Feature Flag Helpers (Convex runtime)
 * Server-side equivalents of app-level feature flag logic with
 * simple health guardrails.
 */

// Read environment flags inside Convex runtime
const ENV_ENABLED = process.env.LANGEXTRACT_ENABLED === 'true'
const ENV_ROLLOUT = Number(process.env.LANGEXTRACT_ROLLOUT_PERCENT ?? '0')
const ENV_BASELINE_P95_MS = Number(process.env.LANGEXTRACT_BASELINE_P95_MS ?? '0')

export function getLangExtractServerConfig() {
  return {
    enabled: ENV_ENABLED,
    rolloutPercent: isFinite(ENV_ROLLOUT) ? Math.max(0, Math.min(100, ENV_ROLLOUT)) : 0,
  }
}

export function hashStringToBucketServer(input: string): number {
  let hash = 5381
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) + hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0
  const sorted = values.filter(v => v > 0).sort((a, b) => a - b)
  if (sorted.length === 0) return 0
  const index = (percentile / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

async function getRecentP95ProcessingTime(
  ctx: any,
  minutes: number
): Promise<number> {
  const cutoff = Date.now() - minutes * 60 * 1000
  const analyses = await ctx.db
    .query('aiAnalysis')
    .filter((q: any) => q.gte(q.field('createdAt'), cutoff))
    .collect()
  const completed = analyses.filter((a: any) => a.status === 'completed')
  const times = completed
    .map((a: any) => a.processingTime || 0)
    .filter((t: number) => t > 0)
  return calculatePercentile(times, 95)
}

/**
 * Compute success rate over the last N minutes from langExtractMetrics.
 */
async function getRecentSuccessRate(ctx: any, minutes: number): Promise<number> {
  const cutoff = Date.now() - minutes * 60 * 1000
  const metrics = await ctx.db
    .query('langExtractMetrics')
    .filter((q: any) => q.gte(q.field('createdAt'), cutoff))
    .collect()

  if (metrics.length === 0) return 100
  const successful = metrics.filter((m: any) => m.success).length
  return (successful / metrics.length) * 100
}

/**
 * Decide if LangExtract should be enabled for the given user at this moment.
 * Considers global enable, gradual rollout, and a basic health guard
 * (auto-disable if success rate < 90% over the last 10 minutes).
 */
export async function shouldEnableLangExtract(
  ctx: any,
  userId: string
): Promise<boolean> {
  const { enabled, rolloutPercent } = getLangExtractServerConfig()
  if (!enabled) return false

  // Gradual rollout gate
  const bucket = hashStringToBucketServer(userId) % 100
  if (bucket >= rolloutPercent) return false

  // Simple health guardrail (auto-disable behavior)
  try {
    const successRate = await getRecentSuccessRate(ctx, 10)
    if (successRate < 90) {
      // Fire an alert and return false (auto-disable behavior)
      try {
        const { internal } = await import('./_generated/api')
        await ctx.runMutation(
          (internal as any)['monitoring/alerting_system'].processAlert,
          {
            alertType: 'success_rate',
            severity: 'critical',
            conditions: {
              threshold: 0.9,
              actualValue: successRate / 100,
              timeWindow: '10m',
              service: 'langextract',
            },
            metadata: { source: 'feature_flags', autoDisable: true },
          }
        )
      } catch (_alertError) {
        // Best-effort alerting; don't block
      }
      return false
    }
    // Optional p95 latency guardrail if baseline is provided
    if (isFinite(ENV_BASELINE_P95_MS) && ENV_BASELINE_P95_MS > 0) {
      const recentP95 = await getRecentP95ProcessingTime(ctx, 10)
      if (recentP95 > ENV_BASELINE_P95_MS + 2000) {
        try {
          const { internal } = await import('./_generated/api')
          await ctx.runMutation(
            (internal as any)['monitoring/alerting_system'].processAlert,
            {
              alertType: 'latency_p95',
              severity: 'critical',
              conditions: {
                thresholdMs: ENV_BASELINE_P95_MS + 2000,
                actualMs: recentP95,
                baselineMs: ENV_BASELINE_P95_MS,
                timeWindow: '10m',
                service: 'langextract',
              },
              metadata: { source: 'feature_flags', autoDisable: true },
            }
          )
        } catch (_alertError) {
          // Best-effort
        }
        return false
      }
    }
  } catch (_error) {
    // If metrics read fails, do not block rollout
  }

  return true
}


