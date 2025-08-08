/*
 Focused unit tests for LangExtract gating inside analyzeJournalEntry.
 Mocks Convex generated API, ai_validation helpers, and fetch to Gemini.
*/

// Minimal Response shim for Node test runtime
class TestResponse {
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
  async text() {
    if (typeof this._body === 'string') return this._body
    return JSON.stringify(this._body)
  }
}
;(global as any).Response = (global as any).Response || TestResponse

// Mock Convex generated API with stubs to avoid codegen dependency
jest.mock('../_generated/api', () => require('../_generated_stubs/api.js'))

// Relax validation and limits for tests
jest.mock('../utils/ai_validation', () => ({
  validateAIRequest: (d: any) => d,
  validateJournalContent: () => ({}),
  checkUserTierLimits: () => ({ allowed: true }),
  checkRateLimit: () => ({ allowed: true, resetTime: Date.now() + 1000 }),
  validateUserAuth: async () => ({ valid: true, userId: 'user_1' }),
  generateRequestLogData: () => ({}),
}))

// Provide a stable fake Gemini response
const makeGeminiOk = () => ({
  candidates: [
    {
      content: {
        parts: [
          {
            text:
              '{"sentiment": {"score": 8.2, "confidence": 0.9, "emotions": ["joy"], "reasoning": "clear"}}',
          },
        ],
      },
    },
  ],
})

describe('analyzeJournalEntry – LangExtract gating', () => {
  const realFetch = global.fetch as any
  let analyzeJournalEntry: any

  beforeAll(async () => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key'
    jest.resetModules()
  })

  beforeEach(async () => {
    jest.resetModules()
    ;(global as any).fetch = jest.fn(async () =>
      new TestResponse(makeGeminiOk(), { status: 200 })
    )
    const mod = await import('../ai_processing')
    analyzeJournalEntry = mod.analyzeJournalEntry
  })

  afterAll(() => {
    ;(global as any).fetch = realFetch
  })

  function makeCtx() {
    const calls: { actions: any[]; mutations: any[] } = { actions: [], mutations: [] }
    return {
      calls,
      runQuery: async (_fn: any, args: any) => {
        if (args && typeof args === 'object' && 'service' in args) {
          // api.circuit_breaker_queries.getHealthStatus
          return { isHealthy: true, metrics: { errorCount24h: 0, lastFailureTime: Date.now() - 60000 } }
        }
        if (args && typeof args === 'object' && 'userId' in args && 'limit' in args) {
          // internal.aiAnalysis.getRecentForPatterns
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
      runAction: async (_fn: any, input: any) => {
        calls.actions.push({ _fn, input })
        return { success: true, result: { structuredData: { emotions: [], themes: [], triggers: [], communication: [], relationships: [] }, extractedEntities: [], processingSuccess: true } }
      },
      runMutation: async (_fn: any, input: any) => {
        calls.mutations.push({ _fn, input })
        return undefined
      },
      scheduler: { runAfter: jest.fn() },
    }
  }

  function makeRequest(body: any) {
    return {
      headers: { get: (_k: string) => 'Bearer test' },
      json: async () => body,
      url: 'https://convex.test/ai/analyze',
    }
  }

  it('does not call LangExtract when flag disabled', async () => {
    jest.doMock('../feature_flags', () => ({
      getLangExtractServerConfig: () => ({ enabled: false, rolloutPercent: 0 }),
      shouldEnableLangExtract: async () => false,
    }))
    const { analyzeJournalEntry: fn } = await import('../ai_processing')
    const ctx: any = makeCtx()
    const req: any = makeRequest({ entryId: 'entry_1', userId: 'user_1' })

    const res: any = await fn(ctx, req)
    expect(res.status).toBe(200)
    // Ensure no action call
    const actionCall = ctx.calls.actions.find(c => true)
    expect(actionCall).toBeUndefined()
    // Ensure storeResult has no langExtractData
    const store = ctx.calls.mutations.find(m => m.input && m.input.status === 'completed')
    expect(store).toBeTruthy()
    expect(store.input.langExtractData).toBeUndefined()
  })

  it('calls LangExtract and stores langExtractData when flag enabled', async () => {
    jest.doMock('../feature_flags', () => ({
      getLangExtractServerConfig: () => ({ enabled: true, rolloutPercent: 100 }),
      shouldEnableLangExtract: async () => true,
    }))
    const { analyzeJournalEntry: fn } = await import('../ai_processing')
    const ctx: any = makeCtx()
    const req: any = makeRequest({ entryId: 'entry_1', userId: 'user_1' })

    const res: any = await fn(ctx, req)
    expect(res.status).toBe(200)
    // Action called
    const actionCall = ctx.calls.actions.find(c => true)
    expect(actionCall).toBeTruthy()
    // Stored with langExtractData
    const store = ctx.calls.mutations.find(m => m.input && m.input.status === 'completed')
    expect(store).toBeTruthy()
    expect(store.input.langExtractData).toBeDefined()
    expect(store.input.langExtractData.processingSuccess).toBe(true)
  })
})


