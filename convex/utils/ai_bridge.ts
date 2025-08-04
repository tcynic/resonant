/**
 * AI Service Bridge for Convex Integration
 * Bridges AI HTTP Actions with legacy Convex functions for compatibility
 * This is a compatibility layer that will be removed after full migration
 */

import { validateAIEnvironment, logAIConfigStatus } from './ai_config'
import {
  extract as langExtract,
  type AnnotatedDocument,
  type ExampleData,
} from 'langextract'

export interface LangExtractResult {
  structuredData: {
    emotions: Array<{ text: string; type: string; intensity?: string }>
    themes: Array<{ text: string; category: string; context?: string }>
    triggers: Array<{ text: string; type: string; severity?: string }>
    communication: Array<{ text: string; style: string; tone?: string }>
    relationships: Array<{ text: string; type: string; dynamic?: string }>
  }
  extractedEntities: string[]
  processingSuccess: boolean
  errorMessage?: string
}

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
  // Enhanced with LangExtract data
  langExtractData?: LangExtractResult
}

// Configuration validation for compatibility
let configValidated = false

// Feature flag for LangExtract preprocessing
const LANGEXTRACT_ENABLED = process.env.LANGEXTRACT_ENABLED === 'true' || false

function validateConfig() {
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
}

/**
 * Preprocess journal entry with LangExtract for structured data extraction
 */
export async function preprocessWithLangExtract(
  content: string,
  relationshipContext?: string
): Promise<LangExtractResult> {
  if (!LANGEXTRACT_ENABLED) {
    return {
      structuredData: {
        emotions: [],
        themes: [],
        triggers: [],
        communication: [],
        relationships: [],
      },
      extractedEntities: [],
      processingSuccess: false,
      errorMessage: 'LangExtract preprocessing disabled',
    }
  }

  try {
    // Define extraction prompt for relationship journal entries
    const promptDescription = `
      Extract emotional and relationship information from this journal entry.
      Focus on emotions, themes, triggers, communication patterns, and relationship dynamics.
      Use exact text from the entry for extractions.
    `

    // Define examples for relationship journal analysis
    const examples: ExampleData[] = [
      {
        text: "Today I felt really frustrated when my partner didn't listen during our conversation about finances. We ended up arguing again, which makes me feel disconnected from them.",
        extractions: [
          {
            extractionClass: 'emotion',
            extractionText: 'frustrated',
            attributes: { type: 'negative', intensity: 'high' },
          },
          {
            extractionClass: 'trigger',
            extractionText: "didn't listen",
            attributes: { type: 'communication', severity: 'medium' },
          },
          {
            extractionClass: 'theme',
            extractionText: 'conversation about finances',
            attributes: { category: 'money', context: 'relationship' },
          },
          {
            extractionClass: 'communication',
            extractionText: 'arguing',
            attributes: { style: 'confrontational', tone: 'negative' },
          },
          {
            extractionClass: 'relationship',
            extractionText: 'feel disconnected',
            attributes: { type: 'emotional_distance', dynamic: 'negative' },
          },
        ],
      },
    ]

    // Add relationship context to the content if provided
    const textToAnalyze = relationshipContext
      ? `${content}\n\nRelationship context: ${relationshipContext}`
      : content

    const result = await langExtract(textToAnalyze, {
      promptDescription,
      examples,
      modelId: 'gemini-2.5-flash',
      modelType: 'gemini',
      temperature: 0.3,
      debug: false,
    })

    // Process the results
    const annotatedDoc = Array.isArray(result) ? result[0] : result
    const extractions = annotatedDoc.extractions || []

    const structuredData = {
      emotions: extractions
        .filter(e => e.extractionClass === 'emotion')
        .map(e => ({
          text: e.extractionText,
          type: (e.attributes?.type as string) || 'unknown',
          intensity: e.attributes?.intensity as string,
        })),
      themes: extractions
        .filter(e => e.extractionClass === 'theme')
        .map(e => ({
          text: e.extractionText,
          category: (e.attributes?.category as string) || 'general',
          context: e.attributes?.context as string,
        })),
      triggers: extractions
        .filter(e => e.extractionClass === 'trigger')
        .map(e => ({
          text: e.extractionText,
          type: (e.attributes?.type as string) || 'unknown',
          severity: e.attributes?.severity as string,
        })),
      communication: extractions
        .filter(e => e.extractionClass === 'communication')
        .map(e => ({
          text: e.extractionText,
          style: (e.attributes?.style as string) || 'neutral',
          tone: e.attributes?.tone as string,
        })),
      relationships: extractions
        .filter(e => e.extractionClass === 'relationship')
        .map(e => ({
          text: e.extractionText,
          type: (e.attributes?.type as string) || 'general',
          dynamic: e.attributes?.dynamic as string,
        })),
    }

    return {
      structuredData,
      extractedEntities: extractions.map(e => e.extractionText),
      processingSuccess: true,
    }
  } catch (error) {
    console.error('LangExtract preprocessing failed:', error)
    return {
      structuredData: {
        emotions: [],
        themes: [],
        triggers: [],
        communication: [],
        relationships: [],
      },
      extractedEntities: [],
      processingSuccess: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Record LangExtract processing metrics for monitoring
 * This function should be called from HTTP Actions where ctx is available
 */
export async function recordLangExtractProcessingMetrics(
  ctx: any,
  userId: string,
  entryId: string,
  result: LangExtractResult,
  processingTimeMs: number,
  fallbackUsed: boolean = false
) {
  if (!ctx.db) {
    console.warn('Database context not available for metrics recording')
    return
  }

  try {
    // Calculate structured data counts
    const structuredDataSize = {
      emotions: result.structuredData.emotions.length,
      themes: result.structuredData.themes.length,
      triggers: result.structuredData.triggers.length,
      communication: result.structuredData.communication.length,
      relationships: result.structuredData.relationships.length,
    }

    // Record metrics using the monitoring function
    await ctx.runMutation(
      'monitoring/langextract-metrics:recordLangExtractMetrics',
      {
        userId,
        entryId,
        processingTimeMs,
        success: result.processingSuccess,
        errorMessage: result.errorMessage,
        extractedEntitiesCount: result.extractedEntities.length,
        structuredDataSize,
        langExtractVersion: 'v1.0', // Update with actual version
        fallbackUsed,
      }
    )
  } catch (error) {
    console.error('Failed to record LangExtract metrics:', error)
    // Don't throw - metrics recording should not fail the main process
  }
}

/**
 * Legacy compatibility function - redirects to HTTP Actions
 * @deprecated This function now throws an error to force migration to HTTP Actions
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
  validateConfig()

  // This function is deprecated and should not be used
  // All AI analysis should go through HTTP Actions via the queue system
  throw new Error(
    'Legacy AI analysis is deprecated. Use HTTP Actions with the queue system instead. ' +
      'This ensures proper error handling, circuit breaker protection, and monitoring.'
  )
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
 * @deprecated Legacy function - kept for compatibility with existing code
 */
function generateDefaultReasoning(sentiment: {
  sentiment_score: number
  emotions_detected: string[]
}): string {
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
 * Enhanced fallback analysis that can use LangExtract data
 */
export async function fallbackAnalysis(
  content: string,
  mood?: string,
  relationshipContext?: string
): Promise<Partial<AnalysisResult>> {
  // Try LangExtract preprocessing if enabled
  let langExtractData: LangExtractResult | undefined
  if (LANGEXTRACT_ENABLED) {
    try {
      langExtractData = await preprocessWithLangExtract(
        content,
        relationshipContext
      )
    } catch (error) {
      console.warn('LangExtract preprocessing failed in fallback:', error)
    }
  }
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

  // Enhanced patterns using LangExtract data when available
  let enhancedPatterns = {
    recurring_themes: [
      ...extractThemes(content, undefined),
      'fallback_analysis',
    ],
    emotional_triggers: extractTriggers(content),
    communication_style: detectCommunicationStyle(content),
    relationship_dynamics: ['basic_sentiment'],
  }

  let enhancedKeywords = Array.from(new Set(emotionalKeywords)).slice(0, 5)
  let enhancedConfidence = 0.5
  let enhancedReasoning = `Fallback analysis: ${sentimentScore > 0 ? 'Positive' : sentimentScore < 0 ? 'Negative' : 'Neutral'} sentiment detected`

  // Use LangExtract data to enhance the analysis if available
  if (langExtractData?.processingSuccess) {
    const { structuredData } = langExtractData

    // Enhance themes with LangExtract data
    const extractedThemes = structuredData.themes.map(t => t.category)
    enhancedPatterns.recurring_themes = Array.from(
      new Set([...enhancedPatterns.recurring_themes, ...extractedThemes])
    )

    // Enhance triggers with LangExtract data
    const extractedTriggers = structuredData.triggers.map(t => t.type)
    enhancedPatterns.emotional_triggers = Array.from(
      new Set([...enhancedPatterns.emotional_triggers, ...extractedTriggers])
    )

    // Enhance communication style with LangExtract data
    const communicationStyles = structuredData.communication.map(c => c.style)
    if (communicationStyles.length > 0) {
      enhancedPatterns.communication_style = communicationStyles[0] // Use first detected style
    }

    // Enhance relationship dynamics with LangExtract data
    const relationshipTypes = structuredData.relationships.map(r => r.type)
    enhancedPatterns.relationship_dynamics = Array.from(
      new Set([...enhancedPatterns.relationship_dynamics, ...relationshipTypes])
    )

    // Enhance emotional keywords
    const extractedEmotions = structuredData.emotions.map(e => e.text)
    enhancedKeywords = Array.from(
      new Set([...enhancedKeywords, ...extractedEmotions])
    ).slice(0, 8)

    // Increase confidence when LangExtract data is available
    enhancedConfidence = 0.7
    enhancedReasoning += ' (enhanced with LangExtract structured data)'
  }

  return {
    sentimentScore,
    emotionalKeywords: enhancedKeywords,
    confidenceLevel: enhancedConfidence,
    reasoning: enhancedReasoning,
    patterns: enhancedPatterns,
    tokensUsed: estimateTokens(content),
    apiCost: estimateCost(content),
    overallConfidence: enhancedConfidence,
    langExtractData, // Include the LangExtract data in the result
  }
}

function getMoodSentiment(mood: string): number {
  const moodMap: { [key: string]: number } = {
    excited: 1.0,
    ecstatic: 1.0,
    grateful: 0.8,
    joyful: 0.8,
    happy: 0.6,
    content: 0.4,
    calm: 0.2,
    neutral: 0.0,
    confused: -0.1,
    concerned: -0.2,
    anxious: -0.3,
    sad: -0.4,
    frustrated: -0.6,
    angry: -0.8,
    devastated: -1.0,
  }

  return moodMap[mood.toLowerCase()] || 0
}
