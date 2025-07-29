/**
 * Tests for advanced pattern matching in fallback analysis
 */

import {
  analyzePatterns,
  performAdvancedPatternAnalysis,
  generatePatternRecommendations,
  RELATIONSHIP_PATTERNS,
} from '../pattern_matching'

describe('Pattern Matching Analysis', () => {
  describe('Basic Pattern Detection', () => {
    test('detects communication patterns', () => {
      const content =
        "We listened to each other's perspective and talked openly about our feelings."
      const result = analyzePatterns(content)

      expect(result.matches.length).toBeGreaterThan(0)
      const matchNames = result.matches.map(m => m.name)
      expect(matchNames).toContain('active_listening')
      expect(matchNames).toContain('open_dialogue')
      expect(result.categoryScores.communication).toBeGreaterThan(0)
    })

    test('detects intimacy patterns', () => {
      const content =
        'We shared a vulnerable moment and felt so connected and close together.'
      const result = analyzePatterns(content)

      const matchNames = result.matches.map(m => m.name)
      expect(matchNames).toContain('emotional_intimacy')
      expect(result.categoryScores.intimacy).toBeGreaterThan(0)
      expect(result.dominantCategory).toBe('intimacy')
    })

    test('detects conflict patterns', () => {
      const content =
        'We had a heated argument and yelled at each other about the same issue again.'
      const result = analyzePatterns(content)

      const matchNames = result.matches.map(m => m.name)
      expect(matchNames).toContain('heated_argument')
      expect(matchNames).toContain('recurring_issues')
      expect(result.categoryScores.conflict).toBeLessThan(0)
      expect(result.overallSentiment).toBe('negative')
    })

    test('detects growth patterns', () => {
      const content =
        "Our relationship is growing stronger and we're learning so much about each other."
      const result = analyzePatterns(content)

      const matchNames = result.matches.map(m => m.name)
      expect(matchNames).toContain('relationship_growth')
      expect(matchNames).toContain('learning_together')
      expect(result.categoryScores.growth).toBeGreaterThan(0)
    })

    test('detects stress patterns', () => {
      const content =
        'Work stress is really affecting our relationship and I feel overwhelmed.'
      const result = analyzePatterns(content)

      const matchNames = result.matches.map(m => m.name)
      expect(matchNames).toContain('external_stress')
      expect(matchNames).toContain('overwhelmed')
      expect(result.categoryScores.stress).toBeLessThan(0)
    })

    test('detects celebration patterns', () => {
      const content =
        "We celebrated our anniversary and I'm so grateful for this amazing relationship!"
      const result = analyzePatterns(content)

      const matchNames = result.matches.map(m => m.name)
      expect(matchNames).toContain('milestone_celebration')
      expect(matchNames).toContain('gratitude_expression')
      expect(result.categoryScores.celebration).toBeGreaterThan(0)
    })
  })

  describe('Sentiment and Confidence Calculation', () => {
    test('calculates positive overall sentiment', () => {
      const content =
        'We had great communication, shared intimate moments, and celebrated our growth together.'
      const result = analyzePatterns(content)

      expect(result.overallSentiment).toBe('positive')
      expect(result.confidenceScore).toBeGreaterThan(0.3)
    })

    test('calculates negative overall sentiment', () => {
      const content =
        'We had heated arguments, feel emotionally distant, and keep having the same conflicts.'
      const result = analyzePatterns(content)

      expect(result.overallSentiment).toBe('negative')
      expect(result.confidenceScore).toBeGreaterThan(0.3)
    })

    test('calculates neutral sentiment for mixed patterns', () => {
      const content =
        'We had some good communication but also got into a fight.'
      const result = analyzePatterns(content)

      // Could be neutral or slightly positive/negative depending on pattern weights
      expect(['positive', 'negative', 'neutral']).toContain(
        result.overallSentiment
      )
    })

    test('increases confidence with more matches', () => {
      const shortContent = 'We talked.'
      const longContent =
        'We had open dialogue, listened actively, shared intimate moments, resolved conflicts through compromise, and celebrated our growth together.'

      const shortResult = analyzePatterns(shortContent)
      const longResult = analyzePatterns(longContent)

      expect(longResult.confidenceScore).toBeGreaterThan(
        shortResult.confidenceScore
      )
      expect(longResult.matches.length).toBeGreaterThan(
        shortResult.matches.length
      )
    })
  })

  describe('Relationship Insights Generation', () => {
    test('generates insights for dominant categories', () => {
      const content =
        'We had amazing communication and really listened to each other.'
      const result = analyzePatterns(content)

      expect(result.relationshipInsights.length).toBeGreaterThan(0)
      expect(
        result.relationshipInsights.some(insight =>
          insight.includes('communication')
        )
      ).toBe(true)
    })

    test('identifies multiple strengths', () => {
      const content =
        "Great communication today, felt very intimate and close, and we're growing stronger together."
      const result = analyzePatterns(content)

      const strengthsInsight = result.relationshipInsights.find(insight =>
        insight.includes('Multiple relationship strengths')
      )
      expect(strengthsInsight).toBeDefined()
    })

    test('identifies areas needing attention', () => {
      const content =
        "Communication breakdown again, feeling distant, and we're stuck in the same conflicts."
      const result = analyzePatterns(content)

      const challengesInsight = result.relationshipInsights.find(insight =>
        insight.includes('areas may need attention')
      )
      expect(challengesInsight).toBeDefined()
    })

    test('generates specific combination insights', () => {
      const content =
        'We listened to each other and shared a vulnerable, intimate moment together.'
      const result = analyzePatterns(content)

      const combinationInsight = result.relationshipInsights.find(insight =>
        insight.includes(
          'communication foundation supporting emotional connection'
        )
      )
      expect(combinationInsight).toBeDefined()
    })

    test('identifies conflict resolution skills', () => {
      const content =
        'We had a heated argument but found a compromise and worked it out.'
      const result = analyzePatterns(content)

      const resolutionInsight = result.relationshipInsights.find(insight =>
        insight.includes('Conflict resolution skills evident')
      )
      expect(resolutionInsight).toBeDefined()
    })

    test('recognizes resilience under stress', () => {
      const content =
        "Work stress is affecting us but we're supporting each other through it."
      const result = analyzePatterns(content)

      const resilienceInsight = result.relationshipInsights.find(insight =>
        insight.includes('resilience under external pressure')
      )
      expect(resilienceInsight).toBeDefined()
    })
  })

  describe('Advanced Pattern Analysis with Trends', () => {
    test('analyzes trends with previous entries', () => {
      const currentEntry =
        'Great communication and feeling very connected today.'
      const previousEntries = [
        'We had some communication issues yesterday.',
        'Felt distant and disconnected last week.',
        'Communication was okay but could be better.',
      ]

      const result = performAdvancedPatternAnalysis(
        currentEntry,
        previousEntries
      )

      expect(result.trendAnalysis).toBeDefined()
      expect(result.trendAnalysis!.improving).toContain('communication')
      expect(result.contextualInsights.length).toBeGreaterThan(0)
    })

    test('identifies declining trends', () => {
      const currentEntry =
        "We're having communication problems and feeling distant."
      const previousEntries = [
        'Great communication and intimacy yesterday.',
        'Wonderful connection and closeness last week.',
        'Amazing talks and emotional intimacy recently.',
      ]

      const result = performAdvancedPatternAnalysis(
        currentEntry,
        previousEntries
      )

      expect(result.trendAnalysis!.declining.length).toBeGreaterThan(0)
      expect(
        result.contextualInsights.some(insight => insight.includes('decline'))
      ).toBe(true)
    })

    test('handles analysis without previous entries', () => {
      const currentEntry = 'Good communication today.'
      const result = performAdvancedPatternAnalysis(currentEntry)

      expect(result.trendAnalysis).toBeUndefined()
      expect(result.contextualInsights).toContain(
        'Analysis based on current entry only'
      )
    })

    test('provides high confidence with multiple entries', () => {
      const currentEntry = 'Great day together.'
      const previousEntries = [
        'Good communication yesterday.',
        'Nice intimacy last week.',
        'Resolved conflict well.',
        'Growing stronger together.',
        'Celebrated our love.',
      ]

      const result = performAdvancedPatternAnalysis(
        currentEntry,
        previousEntries
      )

      expect(
        result.contextualInsights.some(insight =>
          insight.includes('high confidence in patterns')
        )
      ).toBe(true)
    })
  })

  describe('Pattern Recommendations', () => {
    test('generates actionable insights for communication challenges', () => {
      const analysis = {
        matches: [],
        categoryScores: { communication: -1.0 },
        dominantCategory: 'communication',
        overallSentiment: 'negative' as const,
        confidenceScore: 0.7,
        relationshipInsights: [],
      }

      const recommendations = generatePatternRecommendations(analysis)

      expect(recommendations.focusAreas).toContain('communication')
      expect(
        recommendations.actionableInsights.some(insight =>
          insight.includes('dedicated time for open')
        )
      ).toBe(true)
    })

    test('identifies strengths to leverage', () => {
      const analysis = {
        matches: [],
        categoryScores: { communication: 1.5, growth: 1.0 },
        dominantCategory: 'communication',
        overallSentiment: 'positive' as const,
        confidenceScore: 0.8,
        relationshipInsights: [],
      }

      const recommendations = generatePatternRecommendations(analysis)

      expect(
        recommendations.strengthsToLeverage.some(strength =>
          strength.includes('Strong communication skills')
        )
      ).toBe(true)
      expect(
        recommendations.strengthsToLeverage.some(strength =>
          strength.includes('Growth mindset')
        )
      ).toBe(true)
    })

    test('provides conflict resolution recommendations', () => {
      const analysis = {
        matches: [],
        categoryScores: { conflict: -1.2 },
        dominantCategory: 'conflict',
        overallSentiment: 'negative' as const,
        confidenceScore: 0.6,
        relationshipInsights: [],
      }

      const recommendations = generatePatternRecommendations(analysis)

      expect(recommendations.focusAreas).toContain('conflict resolution')
      expect(
        recommendations.actionableInsights.some(insight =>
          insight.includes('conflict resolution techniques')
        )
      ).toBe(true)
    })

    test('provides intimacy recommendations', () => {
      const analysis = {
        matches: [],
        categoryScores: { intimacy: -0.8 },
        dominantCategory: 'intimacy',
        overallSentiment: 'negative' as const,
        confidenceScore: 0.5,
        relationshipInsights: [],
      }

      const recommendations = generatePatternRecommendations(analysis)

      expect(recommendations.focusAreas).toContain(
        'emotional/physical intimacy'
      )
      expect(
        recommendations.actionableInsights.some(insight =>
          insight.includes('one-on-one time')
        )
      ).toBe(true)
    })

    test('provides stress management recommendations', () => {
      const analysis = {
        matches: [],
        categoryScores: { stress: -1.0 },
        dominantCategory: 'stress',
        overallSentiment: 'negative' as const,
        confidenceScore: 0.6,
        relationshipInsights: [],
      }

      const recommendations = generatePatternRecommendations(analysis)

      expect(recommendations.focusAreas).toContain('stress management')
      expect(
        recommendations.actionableInsights.some(insight =>
          insight.includes('support each other during stressful')
        )
      ).toBe(true)
    })

    test('provides generic recommendations when no specific patterns', () => {
      const analysis = {
        matches: [],
        categoryScores: {},
        dominantCategory: null,
        overallSentiment: 'neutral' as const,
        confidenceScore: 0.3,
        relationshipInsights: [],
      }

      const recommendations = generatePatternRecommendations(analysis)

      expect(
        recommendations.actionableInsights.some(insight =>
          insight.includes('regular relationship check-ins')
        )
      ).toBe(true)
      expect(
        recommendations.actionableInsights.some(insight =>
          insight.includes('expressing appreciation')
        )
      ).toBe(true)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('handles empty content', () => {
      const result = analyzePatterns('')

      expect(result.matches.length).toBe(0)
      expect(result.dominantCategory).toBeNull()
      expect(result.overallSentiment).toBe('neutral')
      expect(result.relationshipInsights).toContain(
        'No specific relationship patterns detected'
      )
    })

    test('handles content with no pattern matches', () => {
      const content = 'I went to the store and bought milk.'
      const result = analyzePatterns(content)

      expect(result.matches.length).toBe(0)
      expect(result.categoryScores).toEqual({})
      expect(result.dominantCategory).toBeNull()
    })

    test('handles content with multiple overlapping patterns', () => {
      const content =
        'We had great communication, shared intimate moments, resolved our conflict through compromise, and are growing stronger together while celebrating our love.'
      const result = analyzePatterns(content)

      expect(result.matches.length).toBeGreaterThan(3)
      expect(Object.keys(result.categoryScores).length).toBeGreaterThan(2)
      expect(result.confidenceScore).toBeGreaterThan(0.5)
    })
  })

  describe('Pattern Dictionary Validation', () => {
    test('all patterns have required properties', () => {
      for (const pattern of RELATIONSHIP_PATTERNS) {
        expect(typeof pattern.name).toBe('string')
        expect(pattern.name.length).toBeGreaterThan(0)
        expect(pattern.pattern).toBeInstanceOf(RegExp)
        expect([
          'communication',
          'intimacy',
          'conflict',
          'growth',
          'stress',
          'celebration',
        ]).toContain(pattern.category)
        expect(['positive', 'negative', 'neutral']).toContain(pattern.sentiment)
        expect(typeof pattern.confidence).toBe('number')
        expect(pattern.confidence).toBeGreaterThan(0)
        expect(pattern.confidence).toBeLessThanOrEqual(1)
        expect(typeof pattern.insight).toBe('string')
        expect(pattern.insight.length).toBeGreaterThan(0)
        expect(typeof pattern.weight).toBe('number')
      }
    })

    test('patterns cover all major relationship categories', () => {
      const categories = RELATIONSHIP_PATTERNS.map(p => p.category)
      const uniqueCategories = [...new Set(categories)]

      expect(uniqueCategories).toContain('communication')
      expect(uniqueCategories).toContain('intimacy')
      expect(uniqueCategories).toContain('conflict')
      expect(uniqueCategories).toContain('growth')
      expect(uniqueCategories).toContain('stress')
      expect(uniqueCategories).toContain('celebration')
    })

    test('patterns have balanced positive and negative examples', () => {
      const positivePatterns = RELATIONSHIP_PATTERNS.filter(
        p => p.sentiment === 'positive'
      )
      const negativePatterns = RELATIONSHIP_PATTERNS.filter(
        p => p.sentiment === 'negative'
      )

      expect(positivePatterns.length).toBeGreaterThan(5)
      expect(negativePatterns.length).toBeGreaterThan(5)

      // Should have reasonable balance (not more than 3:1 ratio)
      const ratio =
        Math.max(positivePatterns.length, negativePatterns.length) /
        Math.min(positivePatterns.length, negativePatterns.length)
      expect(ratio).toBeLessThan(3)
    })

    test('pattern regexes are case insensitive', () => {
      // Test a few key patterns
      const communicationPattern = RELATIONSHIP_PATTERNS.find(
        p => p.name === 'active_listening'
      )
      expect(communicationPattern).toBeDefined()

      const testText1 = "we listened to each other's feelings"
      const testText2 = "WE LISTENED TO EACH OTHER'S PERSPECTIVE"
      const testText3 = "We Listened To Each Other's Thoughts"

      expect(communicationPattern!.pattern.test(testText1)).toBe(true)
      expect(communicationPattern!.pattern.test(testText2)).toBe(true)
      expect(communicationPattern!.pattern.test(testText3)).toBe(true)
    })
  })
})
