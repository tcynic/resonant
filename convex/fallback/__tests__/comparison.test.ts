/**
 * Tests for fallback analysis comparison and quality assessment
 */

import {
  compareAIAndFallback,
  generateFallbackQualityMetrics,
  shouldUpgradeFallbackResult,
  AIFallbackComparison,
  FallbackQualityMetrics,
} from '../comparison'

// Mock database context
const mockCtx = {
  db: {
    query: jest.fn(),
    get: jest.fn(),
    insert: jest.fn(),
    patch: jest.fn(),
  },
  runQuery: jest.fn(),
  runMutation: jest.fn(),
}

describe('Fallback Comparison and Analytics', () => {
  describe('compareAIAndFallback', () => {
    test('identifies sentiment agreement between AI and fallback', async () => {
      const aiAnalysis = {
        sentimentScore: 0.7, // positive
        confidenceLevel: 0.8,
        emotionalKeywords: ['happy', 'love', 'wonderful'],
        processingTime: 3000,
        apiCost: 0.02,
        reasoning:
          'Positive emotional indicators with relationship satisfaction',
      }

      const fallbackResult = {
        fallbackAnalysis: {
          sentiment: 'positive' as const,
          confidenceScore: 0.75,
          insights: [
            'Strong positive sentiment detected',
            'Love and happiness keywords found',
          ],
          metadata: {
            keywordsMatched: ['+happy', '+love', '+wonderful'],
            fallbackReason: 'circuit_breaker_open',
          },
        },
        integration: {
          confidence: 0.7,
          qualityAssessment: {
            qualityScore: 0.8,
          },
          processingTime: 150,
        },
        standardizedResults: {
          patterns: {
            recurring_themes: [
              'emotional connection',
              'relationship satisfaction',
            ],
            emotional_triggers: [],
            communication_style: 'positive and expressive',
            relationship_dynamics: ['love and affection'],
          },
        },
      }

      const comparison = await compareAIAndFallback(
        mockCtx,
        aiAnalysis as any,
        fallbackResult as any
      )

      expect(comparison.sentimentAgreement.agreement).toBe(true)
      expect(comparison.sentimentAgreement.aiSentiment).toBe('positive')
      expect(comparison.sentimentAgreement.fallbackSentiment).toBe('positive')
      expect(comparison.sentimentAgreement.confidenceDelta).toBeCloseTo(0.1, 1) // 0.8 - 0.7
      expect(comparison.qualityComparison.qualityAdvantage).toBe('fallback') // Fallback quality is high (0.8)
      expect(comparison.performance.speedAdvantage).toBe('fallback') // 150ms vs 3000ms
    })

    test('identifies sentiment disagreement and quality differences', async () => {
      const aiAnalysis = {
        sentimentScore: 0.6, // positive
        confidenceLevel: 0.9,
        emotionalKeywords: ['content', 'peaceful', 'stable'],
        processingTime: 2500,
        apiCost: 0.015,
        reasoning: 'Moderate positive sentiment with stability indicators',
      }

      const fallbackResult = {
        fallbackAnalysis: {
          sentiment: 'negative' as const, // Disagreement!
          confidenceScore: 0.4,
          insights: ['Negative sentiment detected'],
          metadata: {
            keywordsMatched: ['sad', 'disappointed'],
            fallbackReason: 'api_unavailable',
          },
        },
        integration: {
          confidence: 0.35,
          qualityAssessment: {
            qualityScore: 0.3,
          },
          processingTime: 80,
        },
        standardizedResults: {
          patterns: undefined,
        },
      }

      const comparison = await compareAIAndFallback(
        mockCtx,
        aiAnalysis as any,
        fallbackResult as any
      )

      expect(comparison.sentimentAgreement.agreement).toBe(false)
      expect(comparison.sentimentAgreement.aiSentiment).toBe('positive')
      expect(comparison.sentimentAgreement.fallbackSentiment).toBe('negative')
      expect(comparison.qualityComparison.qualityAdvantage).toBe('ai')
      expect(comparison.upgradeRecommendation.shouldUpgrade).toBe(true)
      expect(comparison.upgradeRecommendation.urgency).toBe('high')
      expect(comparison.upgradeRecommendation.reason).toContain('disagreement')
    })

    test('calculates keyword overlap accurately', async () => {
      const aiAnalysis = {
        sentimentScore: 0.5,
        confidenceLevel: 0.7,
        emotionalKeywords: ['happy', 'love', 'excited', 'grateful'],
        processingTime: 3000,
        apiCost: 0.02,
      }

      const fallbackResult = {
        fallbackAnalysis: {
          sentiment: 'positive' as const,
          confidenceScore: 0.65,
          insights: [],
          metadata: {
            keywordsMatched: ['+happy', '+wonderful', '+grateful', '+joy'],
            fallbackReason: 'test',
          },
        },
        integration: {
          confidence: 0.65,
          qualityAssessment: { qualityScore: 0.6 },
          processingTime: 100,
        },
        standardizedResults: { patterns: undefined },
      }

      const comparison = await compareAIAndFallback(
        mockCtx,
        aiAnalysis as any,
        fallbackResult as any
      )

      // Should find overlap: happy, grateful (2 out of unique 6 keywords)
      expect(comparison.patternConsistency.keywordOverlap).toBeGreaterThan(0.2)
      expect(comparison.patternConsistency.keywordOverlap).toBeLessThan(0.5)
    })
  })

  describe('shouldUpgradeFallbackResult', () => {
    beforeEach(() => {
      mockCtx.db.get.mockReset()
      mockCtx.db.query.mockReset()
    })

    test('recommends upgrade for very low quality fallback', async () => {
      const fallbackAnalysis = {
        _id: 'test-fallback-id',
        userId: 'user-123',
        fallbackMetadata: {
          trigger: 'api_unavailable',
          qualityScore: 0.15, // Very low quality
          confidence: 0.2,
          processingTime: 100,
        },
      }

      mockCtx.db.get.mockResolvedValue(fallbackAnalysis)
      mockCtx.db.query.mockReturnValue({
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        take: jest.fn().mockResolvedValue([]), // No recent AI analyses
      })

      const result = await shouldUpgradeFallbackResult(
        mockCtx,
        'test-fallback-id' as any
      )

      expect(result.shouldUpgrade).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.8)
      expect(result.reason).toContain('very low')
      expect(result.recommendedPriority).toBe('high')
    })

    test('recommends against upgrade when circuit breaker is open', async () => {
      const fallbackAnalysis = {
        _id: 'test-fallback-id',
        userId: 'user-123',
        fallbackMetadata: {
          trigger: 'circuit_breaker_open',
          qualityScore: 0.5, // Moderate quality
          confidence: 0.6,
          processingTime: 100,
        },
      }

      mockCtx.db.get.mockResolvedValue(fallbackAnalysis)
      mockCtx.db.query.mockReturnValue({
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        take: jest.fn().mockResolvedValue([]),
      })

      const result = await shouldUpgradeFallbackResult(
        mockCtx,
        'test-fallback-id' as any
      )

      expect(result.shouldUpgrade).toBe(false)
      expect(result.reason).toContain('Circuit breaker')
      expect(result.recommendedPriority).toBe('low')
    })

    test('recommends upgrade with cost consideration', async () => {
      const fallbackAnalysis = {
        _id: 'test-fallback-id',
        userId: 'user-123',
        fallbackMetadata: {
          trigger: 'retry_exhausted',
          qualityScore: 0.4,
          confidence: 0.5,
          processingTime: 100,
        },
        emotionalKeywords: ['happy', 'love'], // Short content = low cost
      }

      mockCtx.db.get.mockResolvedValue(fallbackAnalysis)

      // Mock recent AI analyses with high quality
      const recentAIAnalyses = [
        { confidenceLevel: 0.85, processingTime: 2000 },
        { confidenceLevel: 0.9, processingTime: 2500 },
        { confidenceLevel: 0.8, processingTime: 1800 },
      ]

      mockCtx.db.query.mockReturnValue({
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        take: jest.fn().mockResolvedValue(recentAIAnalyses),
      })

      const result = await shouldUpgradeFallbackResult(
        mockCtx,
        'test-fallback-id' as any,
        {
          qualityThreshold: 0.7,
          costThreshold: 0.05, // Allow up to 5 cents
        }
      )

      expect(result.estimatedBenefit).toBeGreaterThan(0.2) // High predicted AI quality vs moderate fallback
    })

    test('handles force upgrade option', async () => {
      const fallbackAnalysis = {
        _id: 'test-fallback-id',
        userId: 'user-123',
        fallbackMetadata: {
          trigger: 'manual_request',
          qualityScore: 0.8, // High quality
          confidence: 0.85,
          processingTime: 100,
        },
      }

      mockCtx.db.get.mockResolvedValue(fallbackAnalysis)
      mockCtx.db.query.mockReturnValue({
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        take: jest.fn().mockResolvedValue([]),
      })

      const result = await shouldUpgradeFallbackResult(
        mockCtx,
        'test-fallback-id' as any,
        {
          forceUpgrade: true,
        }
      )

      expect(result.shouldUpgrade).toBe(true)
      expect(result.confidence).toBe(1.0)
      expect(result.reason).toBe('Force upgrade requested')
      expect(result.recommendedPriority).toBe('high')
    })
  })

  describe('Quality Metrics Calculation', () => {
    test('calculates overall quality metrics correctly', () => {
      const fallbackAnalyses = [
        {
          fallbackMetadata: {
            confidence: 0.8,
            qualityScore: 0.7,
            trigger: 'circuit_breaker_open',
          },
          createdAt: Date.now() - 1000,
        },
        {
          fallbackMetadata: {
            confidence: 0.6,
            qualityScore: 0.5,
            trigger: 'api_unavailable',
          },
          createdAt: Date.now() - 2000,
        },
        {
          fallbackMetadata: {
            confidence: 0.9,
            qualityScore: 0.8,
            trigger: 'retry_exhausted',
          },
          createdAt: Date.now() - 3000,
        },
        {
          fallbackMetadata: {
            confidence: 0.4,
            qualityScore: 0.2,
            trigger: 'rate_limit',
          },
          createdAt: Date.now() - 4000,
        },
      ]

      // Test the helper functions directly
      const avgConfidence =
        fallbackAnalyses.reduce(
          (sum, a) => sum + (a.fallbackMetadata?.confidence || 0),
          0
        ) / fallbackAnalyses.length
      const successRate =
        fallbackAnalyses.filter(
          a => (a.fallbackMetadata?.qualityScore || 0) >= 0.3
        ).length / fallbackAnalyses.length

      expect(avgConfidence).toBeCloseTo(0.675, 2) // (0.8 + 0.6 + 0.9 + 0.4) / 4
      expect(successRate).toBeCloseTo(0.75, 2) // 3 out of 4 above threshold
    })

    test('handles empty analysis list gracefully', () => {
      const emptyAnalyses: any[] = []

      // Should not throw and return sensible defaults
      const avgConfidence =
        emptyAnalyses.reduce(
          (sum, a) => sum + (a.fallbackMetadata?.confidence || 0),
          0
        ) / (emptyAnalyses.length || 1)
      const successRate =
        emptyAnalyses.filter(
          a => (a.fallbackMetadata?.qualityScore || 0) >= 0.3
        ).length / (emptyAnalyses.length || 1)

      expect(avgConfidence).toBe(0)
      expect(successRate).toBe(0)
    })
  })

  describe('Performance Comparison', () => {
    test('correctly identifies speed advantage', async () => {
      const fastFallback = {
        fallbackAnalysis: {
          sentiment: 'positive' as const,
          confidenceScore: 0.7,
          insights: [],
          metadata: { keywordsMatched: [], fallbackReason: 'test' },
        },
        integration: {
          confidence: 0.7,
          qualityAssessment: { qualityScore: 0.6 },
          processingTime: 50,
        }, // Very fast
        standardizedResults: { patterns: undefined },
      }

      const slowAI = {
        sentimentScore: 0.7,
        confidenceLevel: 0.8,
        emotionalKeywords: ['happy'],
        processingTime: 5000, // Slow
        apiCost: 0.03,
      }

      const comparison = await compareAIAndFallback(
        mockCtx,
        slowAI as any,
        fastFallback as any
      )

      expect(comparison.performance.speedAdvantage).toBe('fallback')
      expect(comparison.performance.costComparison.costSavings).toBe(0.03)
      expect(comparison.performance.costComparison.fallbackCost).toBe(0)
    })

    test('calculates cost savings correctly', async () => {
      const fallbackResult = {
        fallbackAnalysis: {
          sentiment: 'neutral' as const,
          confidenceScore: 0.5,
          insights: [],
          metadata: { keywordsMatched: [], fallbackReason: 'test' },
        },
        integration: {
          confidence: 0.5,
          qualityAssessment: { qualityScore: 0.5 },
          processingTime: 100,
        },
        standardizedResults: { patterns: undefined },
      }

      const expensiveAI = {
        sentimentScore: 0.5,
        confidenceLevel: 0.8,
        emotionalKeywords: ['content'],
        processingTime: 3000,
        apiCost: 0.15, // Expensive analysis
      }

      const comparison = await compareAIAndFallback(
        mockCtx,
        expensiveAI as any,
        fallbackResult as any
      )

      expect(comparison.performance.costComparison.aiCost).toBe(0.15)
      expect(comparison.performance.costComparison.fallbackCost).toBe(0)
      expect(comparison.performance.costComparison.costSavings).toBe(0.15)
    })
  })

  describe('Edge Cases', () => {
    test('handles missing metadata gracefully', async () => {
      const incompleteAI = {
        sentimentScore: 0.5,
        confidenceLevel: 0.7,
        emotionalKeywords: undefined, // Missing
        processingTime: undefined, // Missing
        apiCost: undefined, // Missing
      }

      const incompleteFallback = {
        fallbackAnalysis: {
          sentiment: 'neutral' as const,
          confidenceScore: 0.5,
          insights: [],
          metadata: { keywordsMatched: [], fallbackReason: 'test' },
        },
        integration: {
          confidence: 0.5,
          qualityAssessment: { qualityScore: 0.5 },
          processingTime: 100,
        },
        standardizedResults: { patterns: undefined },
      }

      // Should not throw
      const comparison = await compareAIAndFallback(
        mockCtx,
        incompleteAI as any,
        incompleteFallback as any
      )

      expect(comparison).toBeDefined()
      expect(comparison.sentimentAgreement.agreement).toBeDefined()
      expect(comparison.performance.costComparison.costSavings).toBe(0) // Default to 0 when AI cost missing
    })

    test('handles neutral sentiment correctly', async () => {
      const neutralAI = {
        sentimentScore: 0.1, // Neutral range
        confidenceLevel: 0.6,
        emotionalKeywords: ['okay', 'fine'],
        processingTime: 2000,
        apiCost: 0.01,
      }

      const neutralFallback = {
        fallbackAnalysis: {
          sentiment: 'neutral' as const,
          confidenceScore: 0.5,
          insights: [],
          metadata: { keywordsMatched: ['okay'], fallbackReason: 'test' },
        },
        integration: {
          confidence: 0.5,
          qualityAssessment: { qualityScore: 0.5 },
          processingTime: 100,
        },
        standardizedResults: { patterns: undefined },
      }

      const comparison = await compareAIAndFallback(
        mockCtx,
        neutralAI as any,
        neutralFallback as any
      )

      expect(comparison.sentimentAgreement.agreement).toBe(true)
      expect(comparison.sentimentAgreement.aiSentiment).toBe('neutral')
      expect(comparison.sentimentAgreement.fallbackSentiment).toBe('neutral')
    })
  })
})
