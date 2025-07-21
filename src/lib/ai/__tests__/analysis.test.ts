/**
 * Tests for Enhanced DSPy Analysis Modules
 * Testing sentiment analysis, emotional stability, and energy impact modules
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import {
  SentimentAnalysisModule,
  EmotionalStabilityModule,
  EnergyImpactModule,
  RelationshipAnalyzer,
} from '../analysis'
import { GeminiClient } from '../gemini-client'

// Set up environment for testing
process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key'

// Mock GeminiClient
jest.mock('../gemini-client')

describe('Enhanced DSPy Analysis Modules', () => {
  let mockGeminiClient: jest.Mocked<GeminiClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockGeminiClient = {
      generateStructuredResponse: jest.fn(),
      generateContent: jest.fn(),
      generateWithRetry: jest.fn(),
      getConfig: jest.fn(),
      updateConfig: jest.fn(),
      getUsageStats: jest.fn(),
      genAI: {} as unknown,
      model: {} as unknown,
      config: {} as unknown,
      requestCount: 0,
      totalTokens: 0,
      totalCost: 0,
      lastRequestTime: 0,
      isInitialized: true,
      maxRequestsPerMinute: 60,
      initializeModel: jest.fn(),
      enforceRateLimit: jest.fn(),
      calculateActualCost: jest.fn(),
    } as unknown as jest.Mocked<GeminiClient>
  })

  describe('SentimentAnalysisModule', () => {
    test('should analyze positive sentiment correctly', async () => {
      const sentimentModule = new SentimentAnalysisModule(mockGeminiClient)

      // Mock Gemini response for positive sentiment
      mockGeminiClient.generateStructuredResponse.mockResolvedValue({
        sentiment_score: 8.5,
        emotions_detected: ['joy', 'love', 'contentment'],
        confidence: 0.92,
        explanation:
          'Very positive emotional content with strong connection indicators',
      })

      const result = await sentimentModule.analyzeSentiment(
        'I had a wonderful day with my partner. We laughed and felt so connected.'
      )

      expect(result.sentiment_score).toBe(8.5)
      expect(result.emotions_detected).toContain('joy')
      expect(result.emotions_detected).toContain('love')
      expect(result.confidence).toBe(0.92)
      expect(mockGeminiClient.generateStructuredResponse).toHaveBeenCalledTimes(
        1
      )
    })

    test('should analyze negative sentiment correctly', async () => {
      const sentimentModule = new SentimentAnalysisModule(mockGeminiClient)

      // Mock Gemini response for negative sentiment
      mockGeminiClient.generateStructuredResponse.mockResolvedValue({
        sentiment_score: 2.5,
        emotions_detected: ['frustration', 'sadness', 'anger'],
        confidence: 0.88,
        explanation: 'Negative sentiment with conflict indicators',
      })

      const result = await sentimentModule.analyzeSentiment(
        'We had a big fight today. I feel so frustrated and hurt.'
      )

      expect(result.sentiment_score).toBe(2.5)
      expect(result.emotions_detected).toContain('frustration')
      expect(result.emotions_detected).toContain('sadness')
      expect(result.confidence).toBe(0.88)
    })

    test('should generate DSPy-style prompts with examples', async () => {
      const sentimentModule = new SentimentAnalysisModule(mockGeminiClient)

      mockGeminiClient.generateStructuredResponse.mockResolvedValue({
        sentiment_score: 7.0,
        emotions_detected: ['contentment'],
        confidence: 0.85,
        explanation: 'Moderately positive sentiment',
      })

      await sentimentModule.analyzeSentiment('Today was okay with my partner.')

      // Verify the prompt includes DSPy examples and proper structure
      const promptCall =
        mockGeminiClient.generateStructuredResponse.mock.calls[0][0]
      expect(promptCall).toContain(
        'Analyze sentiment of relationship journal entries'
      )
      expect(promptCall).toContain('Examples:')
      expect(promptCall).toContain('I had a wonderful day with my partner')
      expect(promptCall).toContain('JSON format')
    })

    test('should validate inputs correctly', async () => {
      const sentimentModule = new SentimentAnalysisModule(mockGeminiClient)

      // Test with invalid input (too short)
      await expect(
        sentimentModule.forward({ journal_entry: 'Hi' })
      ).rejects.toThrow(
        'AI response validation failed: Input validation failed'
      )
    })
  })

  describe('EmotionalStabilityModule', () => {
    test('should analyze stability patterns correctly', async () => {
      const stabilityModule = new EmotionalStabilityModule(mockGeminiClient)

      mockGeminiClient.generateStructuredResponse.mockResolvedValue({
        stability_score: 75,
        trend_direction: 'improving',
        volatility_level: 'low',
        recovery_patterns:
          'Quick recovery from negative events, consistent positive trajectory',
      })

      const sentimentHistory = [
        { score: 8, timestamp: Date.now(), emotions: ['happy', 'content'] },
        { score: 6, timestamp: Date.now() - 86400000, emotions: ['neutral'] },
        { score: 7, timestamp: Date.now() - 172800000, emotions: ['positive'] },
      ]

      const result = await stabilityModule.analyzeStability(sentimentHistory)

      expect(result.stability_score).toBe(75)
      expect(result.trend_direction).toBe('improving')
      expect(result.volatility_level).toBe('low')
      expect(result.recovery_patterns).toContain('Quick recovery')
    })

    test('should generate stability analysis prompts with history', async () => {
      const stabilityModule = new EmotionalStabilityModule(mockGeminiClient)

      mockGeminiClient.generateStructuredResponse.mockResolvedValue({
        stability_score: 60,
        trend_direction: 'stable',
        volatility_level: 'moderate',
        recovery_patterns: 'Moderate recovery patterns',
      })

      const sentimentHistory = [
        { score: 5, timestamp: Date.now(), emotions: ['neutral'] },
      ]

      await stabilityModule.analyzeStability(sentimentHistory)

      const promptCall =
        mockGeminiClient.generateStructuredResponse.mock.calls[0][0]
      expect(promptCall).toContain('Analyze emotional stability patterns')
      expect(promptCall).toContain('Sentiment History')
      expect(promptCall).toContain('Score: 5/10')
      expect(promptCall).toContain('stability_score')
      expect(promptCall).toContain('trend_direction')
    })
  })

  describe('EnergyImpactModule', () => {
    test('should analyze energizing interactions', async () => {
      const energyModule = new EnergyImpactModule(mockGeminiClient)

      mockGeminiClient.generateStructuredResponse.mockResolvedValue({
        energy_score: 9,
        energy_indicators: ['excitement', 'motivation', 'joy'],
        overall_effect: 'energizing',
        explanation:
          'High energy positive interaction with strong motivational elements',
      })

      const result = await energyModule.analyzeEnergyImpact(
        'I feel so energized after our conversation! We made exciting plans together.'
      )

      expect(result.energy_score).toBe(9)
      expect(result.overall_effect).toBe('energizing')
      expect(result.energy_indicators).toContain('excitement')
      expect(result.explanation).toContain('motivational')
    })

    test('should analyze draining interactions', async () => {
      const energyModule = new EnergyImpactModule(mockGeminiClient)

      mockGeminiClient.generateStructuredResponse.mockResolvedValue({
        energy_score: 2,
        energy_indicators: ['exhaustion', 'stress', 'overwhelm'],
        overall_effect: 'draining',
        explanation:
          'Highly draining interaction with conflict and emotional exhaustion',
      })

      const result = await energyModule.analyzeEnergyImpact(
        "I'm completely drained after that argument. So much stress and negativity."
      )

      expect(result.energy_score).toBe(2)
      expect(result.overall_effect).toBe('draining')
      expect(result.energy_indicators).toContain('exhaustion')
    })
  })

  describe('RelationshipAnalyzer (DSPy Pipeline)', () => {
    test('should perform comprehensive multi-stage analysis', async () => {
      const analyzer = new RelationshipAnalyzer(mockGeminiClient)

      // Mock all three analysis responses
      mockGeminiClient.generateStructuredResponse
        .mockResolvedValueOnce({
          sentiment_score: 8.0,
          emotions_detected: ['joy', 'love'],
          confidence: 0.9,
          explanation: 'Positive interaction',
        })
        .mockResolvedValueOnce({
          energy_score: 8,
          energy_indicators: ['happiness', 'motivation'],
          overall_effect: 'energizing',
          explanation: 'Energizing conversation',
        })
        .mockResolvedValueOnce({
          stability_score: 80,
          trend_direction: 'improving',
          volatility_level: 'low',
          recovery_patterns: 'Strong recovery patterns',
        })

      const sentimentHistory = [
        { score: 8, timestamp: Date.now(), emotions: ['happy'] },
        { score: 7, timestamp: Date.now() - 86400000, emotions: ['content'] },
      ]

      const result = await analyzer.analyzeJournalEntry(
        'Had a great conversation with my partner today!',
        sentimentHistory
      )

      expect(result.sentiment.sentiment_score).toBe(8.0)
      expect(result.energy.energy_score).toBe(8)
      expect(result.stability?.stability_score).toBe(80)
      expect(result.metadata.modules_used).toEqual([
        'sentiment',
        'energy',
        'stability',
      ])
      expect(result.metadata.overall_confidence).toBeDefined()
      expect(result.metadata.timestamp).toBeDefined()
    })

    test('should calculate overall confidence correctly', async () => {
      const analyzer = new RelationshipAnalyzer(mockGeminiClient)

      // Mock responses with different confidence levels
      mockGeminiClient.generateStructuredResponse
        .mockResolvedValueOnce({
          sentiment_score: 7.0,
          emotions_detected: ['content'],
          confidence: 0.95, // High confidence
          explanation: 'Clear sentiment',
        })
        .mockResolvedValueOnce({
          energy_score: 6,
          energy_indicators: ['calm'],
          overall_effect: 'neutral',
          explanation: 'Neutral energy',
        })

      const result = await analyzer.analyzeJournalEntry(
        'Today was pretty normal.'
      )

      // Should have calculated confidence based on sentiment (0.95) and energy (0.8 default)
      // Weighted: 0.95 * 0.7 + 0.8 * 0.3 = 0.665 + 0.24 = 0.905 ≈ 0.91
      expect(result.metadata.overall_confidence).toBeCloseTo(0.91, 1)
    })

    test('should handle analysis without sentiment history', async () => {
      const analyzer = new RelationshipAnalyzer(mockGeminiClient)

      mockGeminiClient.generateStructuredResponse
        .mockResolvedValueOnce({
          sentiment_score: 6.0,
          emotions_detected: ['neutral'],
          confidence: 0.8,
          explanation: 'Neutral sentiment',
        })
        .mockResolvedValueOnce({
          energy_score: 5,
          energy_indicators: ['calm'],
          overall_effect: 'neutral',
          explanation: 'Neutral energy',
        })

      const result = await analyzer.analyzeJournalEntry('Just a regular day.')

      expect(result.sentiment).toBeDefined()
      expect(result.energy).toBeDefined()
      expect(result.stability).toBeNull()
      expect(result.metadata.modules_used).toEqual(['sentiment', 'energy'])
    })
  })

  describe('DSPy Integration Patterns', () => {
    test('should follow DSPy signature validation patterns', async () => {
      const sentimentModule = new SentimentAnalysisModule(mockGeminiClient)

      // Test that signature validation works
      const signature = sentimentModule.getSignature()
      expect(signature.name).toBe('SentimentAnalysis')
      expect(signature.description).toContain('emotional intelligence')
      expect(signature.inputs.journal_entry.required).toBe(true)
      expect(signature.outputs.sentiment_score.required).toBe(true)
      expect(signature.examples).toHaveLength(2)
    })

    test('should generate proper DSPy-style prompts', async () => {
      const sentimentModule = new SentimentAnalysisModule(mockGeminiClient)

      mockGeminiClient.generateStructuredResponse.mockResolvedValue({
        sentiment_score: 5.0,
        emotions_detected: ['neutral'],
        confidence: 0.75,
        explanation: 'Neutral sentiment analysis',
      })

      await sentimentModule.analyzeSentiment('This is a test entry.')

      const prompt =
        mockGeminiClient.generateStructuredResponse.mock.calls[0][0]

      // Should include DSPy signature elements
      expect(prompt).toContain(
        'Analyze sentiment of relationship journal entries'
      )
      expect(prompt).toContain('Examples:')
      expect(prompt).toContain('I had a wonderful day with my partner')
      expect(prompt).toContain('sentiment_score')
      expect(prompt).toContain('emotions_detected')
      expect(prompt).toContain('confidence')
      expect(prompt).toContain('JSON format')
    })
  })
})
