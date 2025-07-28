/**
 * Integration tests for real AI analysis
 */

import { describe, it, expect } from '@jest/globals'
import { fallbackAnalysis } from '../utils/ai_bridge'

describe('AI Integration', () => {
  describe('fallbackAnalysis', () => {
    it('should provide rule-based sentiment analysis when AI fails', () => {
      const result = fallbackAnalysis(
        'I love spending time with my wonderful partner. They make me so happy and joyful.',
        'happy'
      )

      expect(result.sentimentScore).toBeGreaterThan(0) // Should detect positive sentiment
      expect(result.emotionalKeywords).toContain('love')
      expect(result.emotionalKeywords).toContain('happy')
      expect(result.confidenceLevel).toBe(0.5) // Lower confidence for fallback
      expect(result.reasoning).toContain('Fallback analysis')
      expect(result.patterns?.recurring_themes).toContain('fallback_analysis')
    })

    it('should detect negative sentiment in fallback mode', () => {
      const result = fallbackAnalysis(
        'I am so sad and frustrated. This argument made me feel hurt and upset.',
        'sad'
      )

      expect(result.sentimentScore).toBeLessThan(0) // Should detect negative sentiment
      expect(result.emotionalKeywords).toContain('sad')
      expect(result.emotionalKeywords).toContain('frustrated')
      expect(result.reasoning).toContain('Negative sentiment detected')
    })

    it('should handle mood influence in fallback analysis', () => {
      const positiveResult = fallbackAnalysis('Normal day', 'joyful')
      const negativeResult = fallbackAnalysis('Normal day', 'angry')

      expect(positiveResult.sentimentScore).toBeGreaterThan(
        negativeResult.sentimentScore!
      )
    })

    it('should extract themes from content', () => {
      const result = fallbackAnalysis(
        'We spent quality time together and supported each other.',
        undefined
      )

      expect(result.patterns?.recurring_themes).toContain('quality_time')
      expect(result.patterns?.recurring_themes).toContain('mutual_support')
    })

    it('should detect communication styles', () => {
      const collaborativeResult = fallbackAnalysis(
        'We talked about our feelings and discussed our future.',
        undefined
      )

      const directResult = fallbackAnalysis(
        'I told him how I felt about the situation.',
        undefined
      )

      expect(collaborativeResult.patterns?.communication_style).toBe(
        'collaborative'
      )
      expect(directResult.patterns?.communication_style).toBe('direct')
    })

    it('should estimate tokens and costs', () => {
      const shortResult = fallbackAnalysis('Short text', undefined)
      const longResult = fallbackAnalysis(
        'This is a much longer piece of text that should result in higher token and cost estimates.',
        undefined
      )

      expect(longResult.tokensUsed).toBeGreaterThan(shortResult.tokensUsed!)
      expect(longResult.apiCost).toBeGreaterThan(shortResult.apiCost!)
      expect(shortResult.tokensUsed).toBeGreaterThan(0)
      expect(shortResult.apiCost).toBeGreaterThan(0)
    })
  })
})
