import { shouldEnableLangExtract } from '../feature_flags'

function makeCtx(metrics: Array<{ success: boolean; createdAt: number }>) {
  return {
    db: {
      query: (_table: string) => ({
        filter: (_fn: any) => ({
          collect: async () => metrics,
        }),
        collect: async () => metrics,
      }),
    },
    runMutation: jest.fn(async () => undefined),
  }
}

describe('feature_flags.shouldEnableLangExtract', () => {
  const realEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...realEnv }
    jest.resetModules()
  })

  it('returns false when LANGEXTRACT_ENABLED is not true', async () => {
    process.env.LANGEXTRACT_ENABLED = 'false'
    process.env.LANGEXTRACT_ROLLOUT_PERCENT = '100'

    const ctx = makeCtx([])
    const result = await shouldEnableLangExtract(ctx as any, 'user_1')
    expect(result).toBe(false)
  })

  it('returns true when enabled, 100% rollout, and success rate >= 90%', async () => {
    process.env.LANGEXTRACT_ENABLED = 'true'
    process.env.LANGEXTRACT_ROLLOUT_PERCENT = '100'

    const now = Date.now()
    const metrics = [
      { success: true, createdAt: now - 1000 },
      { success: true, createdAt: now - 2000 },
      { success: false, createdAt: now - 3000 },
      { success: true, createdAt: now - 4000 },
      { success: true, createdAt: now - 5000 },
      { success: true, createdAt: now - 6000 },
      { success: true, createdAt: now - 7000 },
      { success: true, createdAt: now - 8000 },
      { success: true, createdAt: now - 9000 },
      { success: true, createdAt: now - 10000 },
    ]
    const ctx = makeCtx(metrics)

    const result = await shouldEnableLangExtract(ctx as any, 'user_1')
    expect(result).toBe(true)
  })

  it('returns false and attempts alert when success rate < 90%', async () => {
    process.env.LANGEXTRACT_ENABLED = 'true'
    process.env.LANGEXTRACT_ROLLOUT_PERCENT = '100'

    const now = Date.now()
    const metrics = [
      { success: true, createdAt: now - 1000 },
      { success: false, createdAt: now - 2000 },
      { success: false, createdAt: now - 3000 },
      { success: false, createdAt: now - 4000 },
    ]
    const ctx = makeCtx(metrics)

    const result = await shouldEnableLangExtract(ctx as any, 'user_low')
    expect(result).toBe(false)
    // Best-effort: ensure alert mutation is attempted (we cannot assert ref path here)
    expect((ctx as any).runMutation).toHaveBeenCalled()
  })

  it('respects rollout percentage bucketing', async () => {
    process.env.LANGEXTRACT_ENABLED = 'true'
    process.env.LANGEXTRACT_ROLLOUT_PERCENT = '0'

    const ctx = makeCtx([])
    const result0 = await shouldEnableLangExtract(ctx as any, 'user_any')
    expect(result0).toBe(false)

    process.env.LANGEXTRACT_ROLLOUT_PERCENT = '100'
    const result100 = await shouldEnableLangExtract(ctx as any, 'user_any')
    expect(result100).toBe(true)
  })

  it('auto-disables when p95 latency exceeds baseline + 2s over 10m (if baseline provided)', async () => {
    process.env.LANGEXTRACT_ENABLED = 'true'
    process.env.LANGEXTRACT_ROLLOUT_PERCENT = '100'
    process.env.LANGEXTRACT_BASELINE_P95_MS = '3000'

    // Build ctx with aiAnalysis data having high processingTime
    const now = Date.now()
    const highTimes = Array.from({ length: 50 }).map((_, i) => ({
      status: 'completed',
      processingTime: 6000 + i, // ~6s
      createdAt: now - (i + 1) * 60 * 100, // within 10m
    }))

    const ctx: any = {
      db: {
        query: (_table: string) => ({
          filter: (_fn: any) => ({
            collect: async () =>
              _table === 'langExtractMetrics'
                ? // Make successRate healthy to isolate latency guard
                  Array.from({ length: 10 }).map((_, j) => ({ success: true, createdAt: now - (j + 1) * 60 * 100 }))
                : highTimes,
          }),
          collect: async () => highTimes,
        }),
      },
      runMutation: jest.fn(async () => undefined),
    }

    const result = await shouldEnableLangExtract(ctx, 'user_1')
    expect(result).toBe(false)
    expect(ctx.runMutation).toHaveBeenCalled()
  })
})


