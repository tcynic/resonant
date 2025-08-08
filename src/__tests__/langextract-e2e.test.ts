// LangExtract E2E Acceptance Criteria tests (mocked Convex HTTP Action environment)

describe.skip('LangExtract E2E (AC tests)', () => {
  const realFetch = global.fetch as any
  const realDateNow = Date.now
  let analyzeJournalEntry: any
  let capturedStoreArgsBaseline: any | null = null
  let capturedStoreArgsEnabled: any | null = null
  // Minimal Response shim for Node test runtime
  ;(global as any).Response = class Response {
    status: number
    headers: any
    private _body: any
    constructor(body?: any, init?: { status?: number; headers?: any }) {
      this._body = body
      this.status = init?.status ?? 200
      this.headers = init?.headers ?? {}
    }
    async json() {
      try {
        return typeof this._body === 'string' ? JSON.parse(this._body) : this._body
      } catch {
        return this._body
      }
    }
  }

  function makeCtx({
    langExtractDelayMs = 0,
    langExtractShouldFail = false,
  }: { langExtractDelayMs?: number; langExtractShouldFail?: boolean }) {
    return {
      runQuery: async (_fn: any, _args: any) => {
        // Circuit breaker health query
        if (_args && typeof _args === 'object' && 'service' in _args) {
          return {
            isHealthy: true,
            metrics: {
              errorCount24h: 0,
              lastFailureTime: Date.now() - 60_000,
            },
          }
        }
        // Previous analyses for patterns
        if (_args && typeof _args === 'object' && 'userId' in _args) {
          return []
        }
        // internal.journalEntries.getForAnalysis
        return {
          content:
            'We discussed finances and it was tense, but we listened and found common ground.',
          mood: 'neutral',
          relationshipId: 'rel_1',
          relationshipName: 'Partner',
          allowAIAnalysis: true,
          userId: 'user_1',
          createdAt: Date.now(),
        }
      },
      runMutation: async (_fn: any, args: any) => {
        // Capture storeResult arguments for verification
        if (args && typeof args === 'object') {
          if (
            Object.prototype.hasOwnProperty.call(args, 'sentimentScore') &&
            Object.prototype.hasOwnProperty.call(args, 'processingTime')
          ) {
            // This is likely internal.aiAnalysis.storeResult
            if (!capturedStoreArgsBaseline && process.env.__TEST_PHASE__ === 'baseline') {
              capturedStoreArgsBaseline = { ...args }
            }
            if (!capturedStoreArgsEnabled && process.env.__TEST_PHASE__ === 'enabled') {
              capturedStoreArgsEnabled = { ...args }
            }
            return 'mock-analysis-id'
          }
          // circuit_breaker recorders - noop
          if (
            Object.prototype.hasOwnProperty.call(args, 'responseTimeMs') ||
            Object.prototype.hasOwnProperty.call(args, 'errorMessage')
          ) {
            return undefined
          }
        }
        return undefined
      },
      runAction: async (_fn: any, _args: any) => {
        // internal.langextract_actions.processWithLangExtract
        if (langExtractShouldFail) {
          throw new Error('Injected LangExtract failure')
        }
        if (langExtractDelayMs > 0) {
          await new Promise(res => setTimeout(res, langExtractDelayMs))
        }
        return {
          success: true,
          result: {
            structuredData: {
              emotions: [{ text: 'tense', type: 'negative', intensity: 'medium' }],
              themes: [{ text: 'finances', category: 'money' }],
              triggers: [],
              communication: [{ text: 'listened', style: 'collaborative' }],
              relationships: [],
            },
            extractedEntities: ['finances', 'listened'],
            processingSuccess: true,
          },
          processingTimeMs: langExtractDelayMs,
        }
      },
      scheduler: { runAfter: async () => {} },
    }
  }

  function makeRequest({ entryId, userId }: { entryId: string; userId: string }) {
    return {
      json: async () => ({ entryId, userId }),
      headers: new Map([['Authorization', 'Bearer test']]),
      url: 'https://example.convex.cloud/ai/analyze',
    } as any
  }

  beforeAll(async () => {
    // Env for tests
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key'
    // Mock external validation helpers to always allow
    jest.resetModules()
    // Mock Convex generated API with stubs to avoid codegen dependency
    jest.doMock('../../convex/_generated/api', () => require('../../convex/_generated_stubs/api.js'))
    jest.doMock('../../convex/utils/ai_validation', () => ({
      validateAIRequest: (d: any) => d,
      validateJournalContent: () => ({}),
      checkUserTierLimits: () => ({ allowed: true }),
      checkRateLimit: () => ({ allowed: true, resetTime: Date.now() + 1000 }),
      validateUserAuth: async () => ({ valid: true, userId: 'user_1' }),
      generateRequestLogData: () => ({}),
    }))

    // Mock global fetch to Gemini with a deterministic JSON-in-text response
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text:
                    '{"sentiment":{"score":8.0,"confidence":0.9,"emotions":["calm"],"reasoning":"Steady tone with constructive resolution"}}',
                },
              ],
            },
          },
        ],
      }),
    })) as any

    // Import after mocks
    ;({ analyzeJournalEntry } = await import('../../convex/ai_processing'))
  })

  afterAll(() => {
    global.fetch = realFetch
    ;(Date as any).now = realDateNow
    jest.dontMock('../../convex/utils/ai_validation')
  })

  it.skip('AC1 – success path with <2s additional latency', async () => {
    // Baseline (flag off)
    process.env.LANGEXTRACT_ENABLED = 'false'
    process.env.LANGEXTRACT_ROLLOUT_PERCENT = '0'
    process.env.__TEST_PHASE__ = 'baseline'
    capturedStoreArgsBaseline = null
    const ctxBaseline = makeCtx({})
    const req = makeRequest({ entryId: 'entry_1', userId: 'user_1' })
    const t0 = Date.now()
    const resBaseline = await analyzeJournalEntry(ctxBaseline as any, req as any)
    const t1 = Date.now()
    expect(resBaseline.status).toBe(200)
    expect(capturedStoreArgsBaseline).toBeTruthy()

    // Enabled (100% rollout) with small preprocessing delay
    process.env.LANGEXTRACT_ENABLED = 'true'
    process.env.LANGEXTRACT_ROLLOUT_PERCENT = '100'
    process.env.__TEST_PHASE__ = 'enabled'
    capturedStoreArgsEnabled = null
    const ctxEnabled = makeCtx({ langExtractDelayMs: 100 })
    const t2 = Date.now()
    const resEnabled = await analyzeJournalEntry(ctxEnabled as any, req as any)
    const t3 = Date.now()
    expect(resEnabled.status).toBe(200)
    expect(capturedStoreArgsEnabled?.langExtractData).toBeTruthy()

    const baselineMs = t1 - t0
    const enabledMs = t3 - t2
    const delta = enabledMs - baselineMs
    expect(delta).toBeLessThan(2000)
  })

  it.skip('AC2 – LangExtract failure does not break analysis (fallback to normal path)', async () => {
    // Force LangExtract to fail; pipeline should still succeed
    process.env.LANGEXTRACT_ENABLED = 'true'
    process.env.LANGEXTRACT_ROLLOUT_PERCENT = '100'
    process.env.__TEST_PHASE__ = 'enabled'
    capturedStoreArgsEnabled = null
    const ctx = makeCtx({ langExtractShouldFail: true })
    const req = makeRequest({ entryId: 'entry_2', userId: 'user_1' })
    const res = await analyzeJournalEntry(ctx as any, req as any)
    expect(res.status).toBe(200)
    expect(capturedStoreArgsEnabled).toBeTruthy()
    // When LangExtract fails, langExtractData should be undefined
    expect(capturedStoreArgsEnabled.langExtractData).toBeUndefined()
  })

  it.skip('AC3 – disabled flag yields parity (no langExtractData)', async () => {
    // Run with flag off and 0% rollout, verify no langExtractData
    process.env.LANGEXTRACT_ENABLED = 'false'
    process.env.LANGEXTRACT_ROLLOUT_PERCENT = '0'
    process.env.__TEST_PHASE__ = 'baseline'
    capturedStoreArgsBaseline = null
    const ctx = makeCtx({})
    const req = makeRequest({ entryId: 'entry_3', userId: 'user_1' })
    const res = await analyzeJournalEntry(ctx as any, req as any)
    expect(res.status).toBe(200)
    expect(capturedStoreArgsBaseline).toBeTruthy()
    expect(capturedStoreArgsBaseline.langExtractData).toBeUndefined()
  })
})
