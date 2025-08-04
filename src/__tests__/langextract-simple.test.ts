/**
 * Simple LangExtract integration test
 */

import {
  preprocessWithLangExtract,
  fallbackAnalysis,
} from '../../convex/utils/ai_bridge'

// Mock LangExtract to avoid external API calls in tests
jest.mock('langextract', () => ({
  extract: jest.fn(),
}))

describe('LangExtract Integration (Simple)', () => {
  const mockExtract = require('langextract').extract

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('preprocessWithLangExtract', () => {
    it('should return disabled result when feature flag is disabled', async () => {
      // Feature flag defaults to false
      const result = await preprocessWithLangExtract('test content')

      expect(result.processingSuccess).toBe(false)
      expect(result.errorMessage).toBe('LangExtract preprocessing disabled')
      expect(result.extractedEntities).toEqual([])
      expect(result.structuredData.emotions).toEqual([])
    })
  })

  describe('fallbackAnalysis', () => {
    it('should provide basic sentiment analysis', async () => {
      const result = await fallbackAnalysis('I felt happy today')

      expect(result.sentimentScore).toBeGreaterThan(0) // Should detect positive sentiment
      expect(result.emotionalKeywords).toContain('happy')
      expect(result.confidenceLevel).toBeDefined()
      expect(result.reasoning).toBeTruthy()
      expect(result.patterns).toBeDefined()
    })

    it('should handle negative sentiment', async () => {
      const result = await fallbackAnalysis('I felt sad and frustrated')

      expect(result.sentimentScore).toBeLessThan(0) // Should detect negative sentiment
      expect(result.patterns?.recurring_themes).toBeDefined()
      expect(result.patterns?.emotional_triggers).toBeDefined()
    })
  })
})
