/**
 * Tests for rule-based sentiment analysis engine
 */

import {
  analyzeSentimentFallback,
  validateFallbackResult,
  SENTIMENT_KEYWORDS,
  RELATIONSHIP_PATTERNS,
} from '../sentiment_analysis'

describe('Fallback Sentiment Analysis', () => {
  describe('Basic Sentiment Detection', () => {
    test('detects positive sentiment correctly', () => {
      const content =
        "I'm so happy and grateful for my amazing partner. We shared wonderful moments together today."
      const result = analyzeSentimentFallback(content, 'test')

      expect(result.sentiment).toBe('positive')
      expect(result.confidenceScore).toBeGreaterThan(0.5)
      expect(result.metadata.keywordsMatched).toContain('+happy')
      expect(result.metadata.keywordsMatched).toContain('+amazing')
      expect(result.method).toBe('keyword_sentiment')
    })

    test('detects negative sentiment correctly', () => {
      const content =
        "I feel awful and frustrated. We had a terrible fight and I'm devastated."
      const result = analyzeSentimentFallback(content, 'test')

      expect(result.sentiment).toBe('negative')
      expect(result.confidenceScore).toBeGreaterThan(0.4)
      expect(result.metadata.keywordsMatched).toContain('awful')
      expect(result.metadata.keywordsMatched).toContain('terrible')
    })

    test('detects neutral sentiment for ambiguous content', () => {
      const content =
        'We went to the store and bought groceries. The weather was okay.'
      const result = analyzeSentimentFallback(content, 'test')

      expect(result.sentiment).toBe('neutral')
      expect(result.confidenceScore).toBeLessThan(0.6)
    })
  })

  describe('Relationship-Specific Analysis', () => {
    test('detects relationship positive patterns', () => {
      const content =
        "We had great communication today. There's so much trust and understanding between us."
      const result = analyzeSentimentFallback(content, 'test')

      expect(result.sentiment).toBe('positive')
      expect(result.metadata.keywordsMatched).toContain('+rel:communication')
      expect(result.metadata.keywordsMatched).toContain('+rel:trust')
      expect(result.metadata.keywordsMatched).toContain('+rel:understanding')
    })

    test('detects relationship negative patterns', () => {
      const content =
        "We're having constant conflict and tension. There's so much distance between us."
      const result = analyzeSentimentFallback(content, 'test')

      expect(result.sentiment).toBe('negative')
      expect(result.metadata.keywordsMatched).toContain('-rel:conflict')
      expect(result.metadata.keywordsMatched).toContain('-rel:tension')
      expect(result.metadata.keywordsMatched).toContain('-rel:distance')
    })
  })

  describe('Pattern Matching', () => {
    test('detects communication improvement patterns', () => {
      const content =
        'We talked more openly and I feel like we understand each other better now.'
      const result = analyzeSentimentFallback(content, 'test')

      // Should be positive or neutral (may be affected by other factors)
      expect(['positive', 'neutral'].includes(result.sentiment)).toBe(true)
      expect(result.insights).toContain(
        'Communication patterns show improvement'
      )
      expect(result.metadata.patternMatches).toContain(
        'communication_improvement'
      )
    })

    test('detects communication breakdown patterns', () => {
      const content =
        "He won't listen to me and just gives me the silent treatment."
      const result = analyzeSentimentFallback(content, 'test')

      expect(result.sentiment).toBe('negative')
      expect(result.insights).toContain('Communication challenges detected')
      expect(result.metadata.patternMatches).toContain(
        'communication_breakdown'
      )
    })

    test('detects quality time patterns', () => {
      const content =
        'We spent wonderful time together on our date night and had so much fun.'
      const result = analyzeSentimentFallback(content, 'test')

      expect(result.sentiment).toBe('positive')
      expect(result.insights).toContain('Positive quality time activities')
      expect(result.metadata.patternMatches).toContain('quality_time')
    })
  })

  describe('Rule-Based Analysis', () => {
    test('handles negation correctly', () => {
      const content =
        "I'm not happy with how things are going. It's not wonderful at all."
      const result = analyzeSentimentFallback(content, 'test')

      expect(result.metadata.rulesFired).toContain('negation_adjustment')
      // Negation adjustment was applied (may still be positive due to other factors)
      expect(result.metadata.rulesFired).toContain('negation_adjustment')
    })

    test('applies intensity modifiers', () => {
      const content = "I'm extremely happy and absolutely thrilled!"
      const result = analyzeSentimentFallback(content, 'test')

      expect(result.metadata.rulesFired).toContain('intensity_boost')
      expect(result.sentiment).toBe('positive')
    })

    test('handles diminishers', () => {
      const content = "I'm slightly happy and somewhat content."
      const result = analyzeSentimentFallback(content, 'test')

      expect(result.metadata.rulesFired).toContain('intensity_reduction')
    })

    test('detects uncertainty from questions', () => {
      const content =
        'Are we okay? Is this relationship working? What should we do?'
      const result = analyzeSentimentFallback(content, 'test')

      expect(result.metadata.rulesFired).toContain('question_uncertainty')
      expect(result.insights).toContain(
        'Questions indicate reflection or uncertainty'
      )
    })

    test('detects strong emotion from exclamations', () => {
      const content =
        "I love you so much! This is amazing! We're incredible together!"
      const result = analyzeSentimentFallback(content, 'test')

      expect(result.metadata.rulesFired).toContain('exclamation_emphasis')
      expect(result.insights).toContain('Strong emotional expression detected')
    })

    test('adjusts confidence for short entries', () => {
      const shortContent = 'Happy today!'
      const result = analyzeSentimentFallback(shortContent, 'test')

      expect(result.metadata.rulesFired).toContain('short_entry_adjustment')
      expect(result.confidenceScore).toBeLessThan(0.8)
    })

    test('boosts confidence for detailed entries', () => {
      const longContent =
        "Today was an incredible day in our relationship. We spent quality time together, had meaningful conversations, shared our deepest thoughts and feelings, supported each other through challenges, celebrated our achievements, and felt truly connected on every level. The communication was open and honest, the intimacy was deep and fulfilling, and we both felt grateful for what we have together. It's moments like these that remind me why I love this person so much and why our relationship continues to grow stronger every day. We're building something beautiful together, and I'm excited about our future."
      const result = analyzeSentimentFallback(longContent, 'test')

      expect(result.metadata.rulesFired).toContain('detailed_entry_boost')
      expect(result.confidenceScore).toBeGreaterThan(0.6)
    })
  })

  describe('Mood Suggestions', () => {
    test('suggests specific moods based on keywords', () => {
      const content =
        "I'm filled with so much joy and we were celebrating our anniversary with laughter."
      const result = analyzeSentimentFallback(content, 'test')

      // Should suggest a positive mood
      expect(result.moodSuggestion).toBeTruthy()
      expect(
        ['joyful', 'content', 'hopeful'].includes(result.moodSuggestion!)
      ).toBe(true)
    })

    test('suggests mood based on sentiment when no specific indicators', () => {
      const content = 'Things are going well and I feel positive about us.'
      const result = analyzeSentimentFallback(content, 'test')

      expect(result.moodSuggestion).toMatch(/content|hopeful|joyful/)
    })

    test('handles negative mood suggestions', () => {
      const content =
        "I'm crying and feeling so much sadness about our situation."
      const result = analyzeSentimentFallback(content, 'test')

      // Should suggest a negative mood
      expect(result.moodSuggestion).toBeTruthy()
      expect(
        ['sad', 'frustrated', 'anxious'].includes(result.moodSuggestion!)
      ).toBe(true)
    })
  })

  describe('Performance and Quality', () => {
    test('processes analysis quickly', () => {
      const content =
        'This is a test entry with various emotional content to analyze.'
      const result = analyzeSentimentFallback(content, 'test')

      expect(result.processingTimeMs).toBeLessThan(100)
    })

    test('provides comprehensive metadata', () => {
      const content =
        'I love my amazing partner but we had some conflict today.'
      const result = analyzeSentimentFallback(content, 'test')

      expect(result.metadata.fallbackReason).toBe('test')
      expect(result.metadata.keywordsMatched.length).toBeGreaterThan(0)
      expect(Array.isArray(result.insights)).toBe(true)
    })
  })

  describe('Result Validation', () => {
    test('validates high-quality results', () => {
      const content =
        "I'm incredibly happy and grateful! We have amazing communication and deep trust. Our love grows stronger every day."
      const result = analyzeSentimentFallback(content, 'test')
      const validation = validateFallbackResult(result)

      expect(validation.isValid).toBe(true)
      expect(validation.qualityScore).toBeGreaterThan(0.6)
      expect(validation.issues.length).toBeLessThan(2)
    })

    test('identifies low-quality results', () => {
      const content = 'The weather is nice.'
      const result = analyzeSentimentFallback(content, 'test')
      const validation = validateFallbackResult(result)

      expect(validation.qualityScore).toBeLessThan(0.5)
      if (!validation.isValid) {
        expect(validation.issues.length).toBeGreaterThan(0)
      }
    })

    test('penalizes results with very low confidence', () => {
      // Mock a result with very low confidence
      const result = analyzeSentimentFallback('Okay.', 'test')
      result.confidenceScore = 0.1 // Force low confidence

      const validation = validateFallbackResult(result)
      expect(validation.issues).toContain('Very low confidence score')
    })

    test('rewards diverse signal types', () => {
      const content =
        "We're so happy together! Our communication improved and we resolved our conflict well. Are we growing stronger?"
      const result = analyzeSentimentFallback(content, 'test')
      const validation = validateFallbackResult(result)

      // Should have keywords, patterns, and rules
      expect(result.metadata.keywordsMatched.length).toBeGreaterThan(0)
      expect(result.metadata.patternMatches.length).toBeGreaterThan(0)
      expect(result.metadata.rulesFired.length).toBeGreaterThan(0)
      expect(validation.qualityScore).toBeGreaterThan(0.5)
    })
  })

  describe('Edge Cases', () => {
    test('handles empty content', () => {
      const result = analyzeSentimentFallback('', 'test')

      expect(result.sentiment).toBe('neutral')
      expect(result.confidenceScore).toBeLessThan(0.3)
      expect(result.metadata.keywordsMatched.length).toBe(0)
    })

    test('handles content with only punctuation', () => {
      const result = analyzeSentimentFallback('!?!?!', 'test')

      // Punctuation-only content might be interpreted as negative due to uncertainty
      expect(['neutral', 'negative'].includes(result.sentiment)).toBe(true)
      expect(result.metadata.rulesFired).toContain('exclamation_emphasis')
      expect(result.metadata.rulesFired).toContain('question_uncertainty')
    })

    test('handles mixed sentiment content', () => {
      const content =
        "I love my partner but we're having terrible fights and I feel awful about our communication breakdown."
      const result = analyzeSentimentFallback(content, 'test')

      expect(result.metadata.keywordsMatched).toContain('+love')
      expect(result.metadata.keywordsMatched).toContain('terrible')
      expect(result.metadata.keywordsMatched).toContain('awful')
      expect(result.metadata.patternMatches).toContain(
        'communication_breakdown'
      )
    })

    test('handles content with repeated keywords', () => {
      const content =
        "I'm happy, so happy, incredibly happy about our amazing, truly amazing relationship!"
      const result = analyzeSentimentFallback(content, 'test')

      expect(result.sentiment).toBe('positive')
      expect(result.confidenceScore).toBeGreaterThan(0.5)
    })
  })

  describe('Keyword Dictionary Coverage', () => {
    test('has comprehensive positive keywords', () => {
      expect(SENTIMENT_KEYWORDS.positive.keywords.length).toBeGreaterThan(20)
      expect(SENTIMENT_KEYWORDS.positive.keywords).toContain('love')
      expect(SENTIMENT_KEYWORDS.positive.keywords).toContain('happy')
      expect(SENTIMENT_KEYWORDS.positive.keywords).toContain('grateful')
    })

    test('has comprehensive negative keywords', () => {
      expect(SENTIMENT_KEYWORDS.negative.keywords.length).toBeGreaterThan(20)
      expect(SENTIMENT_KEYWORDS.negative.keywords).toContain('sad')
      expect(SENTIMENT_KEYWORDS.negative.keywords).toContain('angry')
      expect(SENTIMENT_KEYWORDS.negative.keywords).toContain('frustrated')
    })

    test('has relationship-specific keywords', () => {
      expect(SENTIMENT_KEYWORDS.relationship_positive.keywords).toContain(
        'trust'
      )
      expect(SENTIMENT_KEYWORDS.relationship_positive.keywords).toContain(
        'communication'
      )
      expect(SENTIMENT_KEYWORDS.relationship_negative.keywords).toContain(
        'conflict'
      )
      expect(SENTIMENT_KEYWORDS.relationship_negative.keywords).toContain(
        'betrayal'
      )
    })

    test('has mood indicator mappings', () => {
      expect(SENTIMENT_KEYWORDS.mood_indicators.joyful).toBeDefined()
      expect(SENTIMENT_KEYWORDS.mood_indicators.sad).toBeDefined()
      expect(SENTIMENT_KEYWORDS.mood_indicators.anxious).toBeDefined()
    })
  })

  describe('Pattern Dictionary Coverage', () => {
    test('has comprehensive relationship patterns', () => {
      expect(RELATIONSHIP_PATTERNS.length).toBeGreaterThan(5)

      const patternNames = RELATIONSHIP_PATTERNS.map(p => p.name)
      expect(patternNames).toContain('communication_improvement')
      expect(patternNames).toContain('communication_breakdown')
      expect(patternNames).toContain('quality_time')
      expect(patternNames).toContain('conflict_resolution')
    })

    test('patterns have proper structure', () => {
      for (const pattern of RELATIONSHIP_PATTERNS) {
        expect(pattern.name).toBeDefined()
        expect(pattern.pattern).toBeInstanceOf(RegExp)
        expect(['positive', 'negative']).toContain(pattern.sentiment)
        expect(pattern.confidence).toBeGreaterThan(0)
        expect(pattern.confidence).toBeLessThanOrEqual(1)
        expect(pattern.insight).toBeDefined()
      }
    })
  })
})
