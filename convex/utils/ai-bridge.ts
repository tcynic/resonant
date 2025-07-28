/**
 * AI Service Bridge for Convex Integration
 * Bridges the AI analysis modules to Convex backend functions
 */

import { getRelationshipAnalyzer } from '../../src/lib/ai/analysis'
import type { SentimentAnalysisResult } from '../../src/lib/ai/gemini-client'
import { validateAIEnvironment, logAIConfigStatus } from './ai-config'

export interface AnalysisResult {
  sentimentScore: number
  emotionalKeywords: string[]
  confidenceLevel: number
  reasoning: string
  patterns: {
    recurring_themes: string[]
    emotional_triggers: string[]
    communication_style: string
    relationship_dynamics: string[]
  }
  tokensUsed: number
  apiCost: number
  energyImpact?: Record<string, unknown>
  stabilityAnalysis?: Record<string, unknown>
  overallConfidence: number
}

// Initialize the relationship analyzer
let analyzer: ReturnType<typeof getRelationshipAnalyzer> | null = null
let configValidated = false

function getAnalyzer() {
  if (!analyzer) {
    // Validate configuration on first use
    if (!configValidated) {
      const validation = logAIConfigStatus()
      if (!validation.isValid) {
        console.error('AI Configuration errors:', validation.errors)
        throw new Error(
          `AI configuration invalid: ${validation.errors.join(', ')}`
        )
      }
      configValidated = true
    }

    analyzer = getRelationshipAnalyzer()
  }
  return analyzer
}

/**
 * Analyze journal entry content with real AI
 */
export async function analyzeJournalEntry(
  content: string,
  relationshipContext?: string,
  mood?: string,
  sentimentHistory?: Array<{
    score: number
    timestamp: number
    emotions?: string[]
  }>
): Promise<AnalysisResult> {
  const analyzer = getAnalyzer()

  try {
    // Perform comprehensive AI analysis
    const result = await analyzer.analyzeJournalEntry(content, sentimentHistory)

    // Map AI analysis results to Convex data format
    return {
      sentimentScore: mapSentimentScore(result.sentiment.sentiment_score),
      emotionalKeywords: result.sentiment.emotions_detected,
      confidenceLevel: result.sentiment.confidence,
      reasoning:
        result.sentiment.explanation ||
        generateDefaultReasoning(result.sentiment),
      patterns: {
        recurring_themes: extractThemes(content, result.energy),
        emotional_triggers: extractTriggers(content),
        communication_style: detectCommunicationStyle(content),
        relationship_dynamics: ['ai_detected_patterns'],
      },
      tokensUsed: estimateTokens(content),
      apiCost: estimateCost(content),
      energyImpact: result.energy,
      stabilityAnalysis: result.stability || undefined,
      overallConfidence:
        result.metadata?.overall_confidence || result.sentiment.confidence,
    }
  } catch (error) {
    console.error('AI analysis failed:', error)
    throw new Error(
      `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Map AI sentiment score (1-10) to database format (-1 to 1)
 */
function mapSentimentScore(aiScore: number): number {
  // Convert 1-10 scale to -1 to 1 scale
  return (aiScore - 5.5) / 4.5
}

/**
 * Generate default reasoning when AI doesn't provide explanation
 */
function generateDefaultReasoning(sentiment: SentimentAnalysisResult): string {
  const score = sentiment.sentiment_score
  const emotions = sentiment.emotions_detected

  if (score >= 7) {
    return `High positive sentiment detected (${score}/10) with emotions: ${emotions.join(', ')}`
  } else if (score <= 4) {
    return `Concerning sentiment detected (${score}/10) with emotions: ${emotions.join(', ')}`
  } else {
    return `Balanced sentiment detected (${score}/10) with emotions: ${emotions.join(', ')}`
  }
}

/**
 * Extract themes from content and energy analysis
 */
function extractThemes(
  content: string,
  energyAnalysis?: Record<string, unknown>
): string[] {
  const themes: string[] = []

  // Energy-based themes
  if (energyAnalysis?.overall_effect === 'energizing') {
    themes.push('positive_interaction')
  } else if (energyAnalysis?.overall_effect === 'draining') {
    themes.push('challenging_interaction')
  }

  // Content-based themes
  if (content.includes('support') || content.includes('help')) {
    themes.push('mutual_support')
  }
  if (content.includes('time together') || content.includes('quality time')) {
    themes.push('quality_time')
  }
  if (content.includes('communicate') || content.includes('talk')) {
    themes.push('communication')
  }
  if (content.includes('understand') || content.includes('listen')) {
    themes.push('empathy')
  }

  return themes
}

/**
 * Extract emotional triggers from content
 */
function extractTriggers(content: string): string[] {
  const triggers: string[] = []

  if (
    content.includes('work') ||
    content.includes('job') ||
    content.includes('career')
  ) {
    triggers.push('work_stress')
  }
  if (content.includes('family') || content.includes('parents')) {
    triggers.push('family_dynamics')
  }
  if (content.includes('money') || content.includes('financial')) {
    triggers.push('financial_concerns')
  }
  if (content.includes('time') || content.includes('busy')) {
    triggers.push('time_pressure')
  }

  return triggers
}

/**
 * Detect communication style from content
 */
function detectCommunicationStyle(content: string): string {
  const lowerContent = content.toLowerCase()
  if (
    lowerContent.includes('we talked') ||
    lowerContent.includes('we discussed') ||
    lowerContent.includes('discussed our')
  ) {
    return 'collaborative'
  } else if (
    lowerContent.includes('i told') ||
    lowerContent.includes('i said')
  ) {
    return 'direct'
  } else if (lowerContent.includes('argue') || lowerContent.includes('fight')) {
    return 'confrontational'
  } else {
    return 'neutral'
  }
}

/**
 * Estimate tokens used (rough approximation)
 */
function estimateTokens(content: string): number {
  return Math.floor(content.length / 4) // Rough estimate: 4 chars per token
}

/**
 * Estimate API cost (rough approximation)
 */
function estimateCost(content: string): number {
  const tokens = estimateTokens(content)
  return Number((tokens * 0.00015).toFixed(6)) // Gemini Flash pricing estimate
}

/**
 * Fallback analysis for when AI fails
 */
export function fallbackAnalysis(
  content: string,
  mood?: string
): Partial<AnalysisResult> {
  // Simple rule-based fallback
  const words = content.toLowerCase().split(/\s+/)
  const positiveWords = [
    'love',
    'happy',
    'joy',
    'great',
    'wonderful',
    'amazing',
  ]
  const negativeWords = [
    'sad',
    'angry',
    'frustrated',
    'hurt',
    'upset',
    'worried',
  ]

  let sentimentScore = 0
  const emotionalKeywords: string[] = []

  words.forEach(word => {
    const cleanWord = word.replace(/[^\w]/g, '') // Remove punctuation
    if (positiveWords.some(pw => cleanWord.includes(pw))) {
      sentimentScore += 0.2
      emotionalKeywords.push(cleanWord)
    } else if (negativeWords.some(nw => cleanWord.includes(nw))) {
      sentimentScore -= 0.2
      emotionalKeywords.push(cleanWord)
    }
  })

  // Apply mood influence
  if (mood) {
    const moodScore = getMoodSentiment(mood)
    sentimentScore = (sentimentScore + moodScore) / 2
  }

  // Normalize to -1 to 1 range
  sentimentScore = Math.max(-1, Math.min(1, sentimentScore))

  return {
    sentimentScore,
    emotionalKeywords: [...new Set(emotionalKeywords)].slice(0, 5),
    confidenceLevel: 0.5, // Lower confidence for fallback
    reasoning: `Fallback analysis: ${sentimentScore > 0 ? 'Positive' : sentimentScore < 0 ? 'Negative' : 'Neutral'} sentiment detected`,
    patterns: {
      recurring_themes: [
        ...extractThemes(content, undefined),
        'fallback_analysis',
      ],
      emotional_triggers: extractTriggers(content),
      communication_style: detectCommunicationStyle(content),
      relationship_dynamics: ['basic_sentiment'],
    },
    tokensUsed: estimateTokens(content),
    apiCost: estimateCost(content),
    overallConfidence: 0.5,
  }
}

function getMoodSentiment(mood: string): number {
  const moodMap: { [key: string]: number } = {
    ecstatic: 1.0,
    joyful: 0.8,
    happy: 0.6,
    content: 0.4,
    calm: 0.2,
    neutral: 0.0,
    concerned: -0.2,
    sad: -0.4,
    frustrated: -0.6,
    angry: -0.8,
    devastated: -1.0,
  }

  return moodMap[mood.toLowerCase()] || 0
}
