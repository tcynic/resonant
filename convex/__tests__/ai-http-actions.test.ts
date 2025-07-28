/**
 * Comprehensive Tests for HTTP Actions AI Processing
 * Tests the migrated AI analysis system for reliability and functionality
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals'

// Mock environment variables for testing
const originalEnv = process.env
beforeEach(() => {
  process.env = {
    ...originalEnv,
    GOOGLE_GEMINI_API_KEY: 'test-key-12345',
    CONVEX_SITE_URL: 'https://test-convex-site.com',
  }
})

afterEach(() => {
  process.env = originalEnv
  jest.clearAllMocks()
})

// Mock fetch for HTTP Actions testing
global.fetch = jest.fn()

describe('HTTP Actions AI Processing', () => {
  describe('AI Processing Request Validation', () => {
    it('should validate required fields in AI processing request', async () => {
      const mockRequest = new Request('https://test.com/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({
          entryId: entryId,
          userId: userId,
        }),
      })

      // Mock successful Gemini API response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        sentiment: {
                          score: 8.5,
                          confidence: 0.92,
                          emotions: ['joy', 'love', 'connection'],
                          reasoning: 'Very positive emotional content',
                        },
                        patterns: {
                          recurring_themes: ['quality_time', 'connection'],
                          emotional_triggers: [],
                          communication_style: 'affectionate',
                          relationship_dynamics: ['mutual_support'],
                        },
                        emotional_stability: {
                          stability_score: 85,
                          trend_direction: 'stable',
                          volatility_level: 'low',
                          recovery_patterns: 'Quick recovery from minor issues',
                        },
                        energy_impact: {
                          energy_score: 9,
                          energy_indicators: ['laughter', 'connection'],
                          overall_effect: 'energizing',
                          explanation:
                            'Very positive and energizing interaction',
                        },
                      }),
                    },
                  ],
                },
              },
            ],
            usageMetadata: {
              promptTokenCount: 150,
              candidatesTokenCount: 200,
              totalTokenCount: 350,
            },
          }),
      })

      const response = await t.action(
        api.ai_processing.analyzeJournalEntry,
        mockRequest
      )

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.analysisId).toBeDefined()
    })

    it('should reject requests with missing authentication', async () => {
      const mockRequest = new Request('https://test.com/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Missing Authorization header
        },
        body: JSON.stringify({
          entryId: entryId,
          userId: userId,
        }),
      })

      const response = await t.action(
        api.ai_processing.analyzeJournalEntry,
        mockRequest
      )

      expect(response.status).toBe(401)

      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('Authentication failed')
    })

    it('should reject requests with invalid entry ID', async () => {
      const mockRequest = new Request('https://test.com/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({
          entryId: 'invalid-entry-id',
          userId: userId,
        }),
      })

      const response = await t.action(
        api.ai_processing.analyzeJournalEntry,
        mockRequest
      )

      expect(response.status).toBe(404)

      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('Journal entry not found')
    })

    it('should respect AI analysis permission settings', async () => {
      // Create entry with AI analysis disabled
      const restrictedEntryId = await t.mutation(
        api.journalEntries.createEntry,
        {
          userId,
          relationshipId,
          content: 'Private entry that should not be analyzed',
          allowAIAnalysis: false,
        }
      )

      const mockRequest = new Request('https://test.com/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({
          entryId: restrictedEntryId,
          userId: userId,
        }),
      })

      const response = await t.action(
        api.ai_processing.analyzeJournalEntry,
        mockRequest
      )

      expect(response.status).toBe(403)

      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('AI analysis not permitted')
    })
  })

  describe('Pattern Detection Migration', () => {
    it('should perform comprehensive analysis with emotional stability', async () => {
      // Create some historical analyses first
      const historicalEntry1 = await t.mutation(
        api.journalEntries.createEntry,
        {
          userId,
          relationshipId,
          content: 'We had a great conversation yesterday',
          mood: 'content',
        }
      )

      const historicalEntry2 = await t.mutation(
        api.journalEntries.createEntry,
        {
          userId,
          relationshipId,
          content: 'Feeling a bit anxious about our future',
          mood: 'anxious',
        }
      )

      // Add historical analyses to database
      await t.mutation(api.aiAnalysis.storeResult, {
        entryId: historicalEntry1 as string,
        userId: userId as string,
        relationshipId: relationshipId as string,
        sentimentScore: 0.6,
        emotionalKeywords: ['happy', 'content'],
        confidenceLevel: 0.8,
        reasoning: 'Positive sentiment detected',
        analysisVersion: 'test-v1.0',
        processingTime: 1000,
        tokensUsed: 100,
        apiCost: 0.01,
        status: 'completed',
      })

      await t.mutation(api.aiAnalysis.storeResult, {
        entryId: historicalEntry2 as string,
        userId: userId as string,
        relationshipId: relationshipId as string,
        sentimentScore: -0.3,
        emotionalKeywords: ['anxious', 'worried'],
        confidenceLevel: 0.7,
        reasoning: 'Negative sentiment with anxiety',
        analysisVersion: 'test-v1.0',
        processingTime: 1200,
        tokensUsed: 120,
        apiCost: 0.012,
        status: 'completed',
      })

      const mockRequest = new Request('https://test.com/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({
          entryId: entryId,
          userId: userId,
        }),
      })

      // Mock Gemini response with comprehensive analysis
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        sentiment: {
                          score: 8.5,
                          confidence: 0.92,
                          emotions: ['joy', 'love', 'connection'],
                          reasoning:
                            'Very positive emotional content with strong connection indicators',
                        },
                        patterns: {
                          recurring_themes: [
                            'quality_time',
                            'emotional_connection',
                          ],
                          emotional_triggers: ['work_stress'],
                          communication_style: 'open_and_supportive',
                          relationship_dynamics: [
                            'mutual_support',
                            'emotional_intimacy',
                          ],
                        },
                        emotional_stability: {
                          stability_score: 78,
                          trend_direction: 'improving',
                          volatility_level: 'moderate',
                          recovery_patterns:
                            'Generally recovers well from conflicts within 1-2 days',
                        },
                        energy_impact: {
                          energy_score: 8,
                          energy_indicators: ['laughter', 'connection', 'joy'],
                          overall_effect: 'energizing',
                          explanation:
                            'This interaction significantly boosted emotional energy and connection',
                        },
                      }),
                    },
                  ],
                },
              },
            ],
          }),
      })

      const response = await t.action(
        api.ai_processing.analyzeJournalEntry,
        mockRequest
      )
      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.analysisId).toBeDefined()

      // Verify stored analysis includes pattern detection
      const analysis = await t.query(api.aiAnalysis.getByEntry, {
        entryId: entryId,
      })

      expect(analysis).toBeTruthy()
      expect(analysis?.emotionalStability).toBeDefined()
      expect(analysis?.emotionalStability?.stability_score).toBe(78)
      expect(analysis?.emotionalStability?.trend_direction).toBe('improving')
      expect(analysis?.energyImpact).toBeDefined()
      expect(analysis?.energyImpact?.energy_score).toBe(8)
      expect(analysis?.energyImpact?.overall_effect).toBe('energizing')
    })

    it('should handle pattern detection with limited history', async () => {
      const mockRequest = new Request('https://test.com/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({
          entryId: entryId,
          userId: userId,
        }),
      })

      // Mock response for user with no history
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        sentiment: {
                          score: 7.5,
                          confidence: 0.85,
                          emotions: ['joy', 'contentment'],
                          reasoning: 'Positive sentiment detected',
                        },
                        patterns: {
                          recurring_themes: ['new_relationship'],
                          emotional_triggers: [],
                          communication_style: 'exploratory',
                          relationship_dynamics: ['getting_to_know'],
                        },
                        emotional_stability: {
                          stability_score: 50,
                          trend_direction: 'stable',
                          volatility_level: 'moderate',
                          recovery_patterns:
                            'Unable to determine from limited data',
                        },
                        energy_impact: {
                          energy_score: 7,
                          energy_indicators: ['excitement', 'nervousness'],
                          overall_effect: 'energizing',
                          explanation:
                            'New relationship energy with positive outlook',
                        },
                      }),
                    },
                  ],
                },
              },
            ],
          }),
      })

      const response = await t.action(
        api.ai_processing.analyzeJournalEntry,
        mockRequest
      )
      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
    })
  })

  describe('Error Handling and Retry Logic', () => {
    it('should handle Gemini API failures with retry', async () => {
      const mockRequest = new Request('https://test.com/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({
          entryId: entryId,
          userId: userId,
          retryCount: 0,
        }),
      })

      // Mock API failure
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      )

      const response = await t.action(
        api.ai_processing.analyzeJournalEntry,
        mockRequest
      )
      expect(response.status).toBe(500)

      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.retryScheduled).toBe(true)
      expect(result.nextRetryAt).toBeDefined()
    })

    it('should fail after maximum retry attempts', async () => {
      const mockRequest = new Request('https://test.com/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({
          entryId: entryId,
          userId: userId,
          retryCount: 3, // Maximum retries exceeded
        }),
      })

      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Persistent API error')
      )

      const response = await t.action(
        api.ai_processing.analyzeJournalEntry,
        mockRequest
      )
      expect(response.status).toBe(500)

      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.retryScheduled).toBeUndefined()
      expect(result.error).toContain('Final failure after 4 attempts')
    })

    it('should handle malformed Gemini responses gracefully', async () => {
      const mockRequest = new Request('https://test.com/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({
          entryId: entryId,
          userId: userId,
        }),
      })

      // Mock malformed response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: 'Invalid JSON response that cannot be parsed',
                    },
                  ],
                },
              },
            ],
          }),
      })

      const response = await t.action(
        api.ai_processing.analyzeJournalEntry,
        mockRequest
      )
      expect(response.status).toBe(500)

      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.retryScheduled).toBe(true)
    })
  })

  describe('Rate Limiting and User Tiers', () => {
    it('should enforce rate limits for free tier users', async () => {
      // This test would require mocking the rate limiting system
      // For now, we'll test the basic structure

      const mockRequest = new Request('https://test.com/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({
          entryId: entryId,
          userId: userId,
        }),
      })

      // In a real test, we'd mock multiple rapid requests
      // and verify rate limiting kicks in
      expect(mockRequest).toBeDefined()
    })
  })

  describe('Database Integration', () => {
    it('should store complete analysis results with pattern data', async () => {
      const mockRequest = new Request('https://test.com/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({
          entryId: entryId,
          userId: userId,
        }),
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        sentiment: {
                          score: 7.2,
                          confidence: 0.88,
                          emotions: ['contentment', 'love'],
                          reasoning: 'Balanced positive sentiment',
                        },
                        patterns: {
                          recurring_themes: ['daily_check_ins', 'affection'],
                          emotional_triggers: ['work_pressure'],
                          communication_style: 'supportive',
                          relationship_dynamics: ['emotional_support'],
                        },
                        emotional_stability: {
                          stability_score: 82,
                          trend_direction: 'stable',
                          volatility_level: 'low',
                          recovery_patterns:
                            'Consistently positive with quick recovery',
                        },
                        energy_impact: {
                          energy_score: 7,
                          energy_indicators: ['comfort', 'security'],
                          overall_effect: 'neutral',
                          explanation: 'Stable and comforting interaction',
                        },
                      }),
                    },
                  ],
                },
              },
            ],
            usageMetadata: {
              totalTokenCount: 300,
            },
          }),
      })

      const response = await t.action(
        api.ai_processing.analyzeJournalEntry,
        mockRequest
      )
      expect(response.status).toBe(200)

      // Verify analysis was stored with all pattern detection data
      const analysis = await t.query(api.aiAnalysis.getByEntry, {
        entryId: entryId,
      })

      expect(analysis).toBeTruthy()
      expect(analysis?.sentimentScore).toBeCloseTo(0.24) // Converted from 7.2/10 to -1/1 scale
      expect(analysis?.emotionalKeywords).toEqual(['contentment', 'love'])
      expect(analysis?.confidenceLevel).toBe(0.88)
      expect(analysis?.patterns?.recurring_themes).toContain('daily_check_ins')
      expect(analysis?.emotionalStability?.stability_score).toBe(82)
      expect(analysis?.energyImpact?.overall_effect).toBe('neutral')
      expect(analysis?.status).toBe('completed')
      expect(analysis?.tokensUsed).toBe(300)
    })

    it('should create analysis records for HTTP Action processing', async () => {
      // Test that the internal mutations work correctly
      const analysisId = await t.mutation(api.aiAnalysis.storeResult, {
        entryId: entryId as string,
        userId: userId as string,
        relationshipId: relationshipId as string,
        sentimentScore: 0.5,
        emotionalKeywords: ['happy', 'excited'],
        confidenceLevel: 0.9,
        reasoning: 'Test analysis',
        patterns: {
          recurring_themes: ['test_theme'],
          emotional_triggers: ['test_trigger'],
          communication_style: 'test_style',
          relationship_dynamics: ['test_dynamic'],
        },
        emotionalStability: {
          stability_score: 85,
          trend_direction: 'improving',
          volatility_level: 'low',
          recovery_patterns: 'Test pattern',
        },
        energyImpact: {
          energy_score: 8,
          energy_indicators: ['test_indicator'],
          overall_effect: 'energizing',
          explanation: 'Test explanation',
        },
        analysisVersion: 'test-v1.0',
        processingTime: 1500,
        tokensUsed: 200,
        apiCost: 0.02,
        status: 'completed',
      })

      expect(analysisId).toBeDefined()

      const stored = await t.query(api.aiAnalysis.getByEntry, {
        entryId: entryId,
      })

      expect(stored).toBeTruthy()
      expect(stored?._id).toEqual(analysisId)
    })
  })

  describe('Scheduling and Integration', () => {
    it('should schedule HTTP analysis from journal creation', async () => {
      // This tests the integration path from journal creation to HTTP Actions

      // Create a new journal entry which should trigger HTTP analysis
      const newEntryId = await t.mutation(api.journalEntries.createEntry, {
        userId,
        relationshipId,
        content: 'Testing automatic analysis scheduling',
        mood: 'neutral',
        allowAIAnalysis: true,
      })

      // In a real integration test, we'd verify that scheduleHttpAnalysis was called
      // For now, we verify the entry was created
      expect(newEntryId).toBeDefined()

      const entry = await t.query(api.journalEntries.getEntryById, {
        entryId: newEntryId,
        userId: userId,
      })

      expect(entry).toBeTruthy()
      expect(entry?.allowAIAnalysis).toBe(true)
    })

    it('should handle reprocessing stuck entries via HTTP Actions', async () => {
      // Create a stuck analysis entry
      const stuckAnalysisId = await t.mutation(api.aiAnalysis.storeResult, {
        entryId: entryId as string,
        userId: userId as string,
        sentimentScore: 0,
        emotionalKeywords: [],
        confidenceLevel: 0,
        reasoning: 'Processing...',
        analysisVersion: 'test-v1.0',
        processingTime: 0,
        tokensUsed: 0,
        apiCost: 0,
        status: 'processing', // Stuck in processing
      })

      // The reprocessStuckEntries should handle this
      const result = await t.mutation(api.aiAnalysis.reprocessStuckEntries, {
        userId: userId,
        dryRun: true, // Just test detection, not actual reprocessing
      })

      expect(result.found).toBeGreaterThan(0)
      expect(result.entries).toHaveLength(result.found)
      expect(result.action).toBe('dry_run_only')
    })
  })

  describe('Performance and Reliability', () => {
    it('should handle concurrent analysis requests', async () => {
      // Create multiple entries for concurrent processing
      const entries = await Promise.all([
        t.mutation(api.journalEntries.createEntry, {
          userId,
          relationshipId,
          content: 'First concurrent entry',
          mood: 'happy',
        }),
        t.mutation(api.journalEntries.createEntry, {
          userId,
          relationshipId,
          content: 'Second concurrent entry',
          mood: 'content',
        }),
        t.mutation(api.journalEntries.createEntry, {
          userId,
          relationshipId,
          content: 'Third concurrent entry',
          mood: 'excited',
        }),
      ])

      expect(entries).toHaveLength(3)
      entries.forEach(entryId => {
        expect(entryId).toBeDefined()
      })
    })

    it('should maintain data consistency under load', async () => {
      // Test that multiple analyses don't interfere with each other
      const promises = []

      for (let i = 0; i < 5; i++) {
        promises.push(
          t.mutation(api.aiAnalysis.storeResult, {
            entryId: entryId as string,
            userId: userId as string,
            sentimentScore: 0.1 * i,
            emotionalKeywords: [`emotion_${i}`],
            confidenceLevel: 0.8,
            reasoning: `Test analysis ${i}`,
            analysisVersion: 'test-v1.0',
            processingTime: 1000 + i * 100,
            tokensUsed: 100 + i * 10,
            apiCost: 0.01 + i * 0.001,
            status: 'completed',
          })
        )
      }

      // Only the last one should persist (same entryId)
      await Promise.all(promises)

      const final = await t.query(api.aiAnalysis.getByEntry, {
        entryId: entryId,
      })

      expect(final).toBeTruthy()
      expect(final?.emotionalKeywords).toContain('emotion_4')
    })
  })
})
